import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createSession,
  deleteSession,
  getUserFromRequest,
} from '../auth.js';
import { prisma } from '../db/index.js';

export const getUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const getRequestUser = (request: IncomingMessage) =>
  getUserFromRequest(prisma, request);

export const createAdminSession = (
  response: ServerResponse,
  userId: string,
) => createSession(prisma, response, userId);

export const deleteAdminSession = (request: IncomingMessage) =>
  deleteSession(prisma, request);

export const listAuditLogs = () =>
  prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { select: { email: true, name: true, role: true } } },
  });
