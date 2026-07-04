import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PrismaClient, Role, User } from '@prisma/client';

const SESSION_COOKIE = 'tap_session';
const SESSION_DAYS = 7;

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, stored: string) => {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return (
    expectedBuffer.length === actual.length &&
    timingSafeEqual(actual, expectedBuffer)
  );
};

export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const createSession = async (
  prisma: PrismaClient,
  response: ServerResponse,
  userId: string,
) => {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${
      SESSION_DAYS * 86400
    }`,
  );
};

export const clearSessionCookie = (response: ServerResponse) => {
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
  );
};

export const readCookie = (request: IncomingMessage, name: string) => {
  const cookie = request.headers.cookie;
  if (!cookie) return null;

  for (const part of cookie.split(';')) {
    const index = part.indexOf('=');
    const key = part.slice(0, index).trim();
    if (key === name) return part.slice(index + 1);
  }
  return null;
};

export const getUserFromRequest = async (
  prisma: PrismaClient,
  request: IncomingMessage,
) => {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
};

export const deleteSession = async (
  prisma: PrismaClient,
  request: IncomingMessage,
) => {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
};

const roleRank: Record<Role, number> = {
  auditor: 1,
  volunteer: 2,
  charity_admin: 3,
};

export const hasRole = (user: User, role: Role) =>
  roleRank[user.role] >= roleRank[role];
