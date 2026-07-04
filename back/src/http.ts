import type { IncomingMessage, ServerResponse } from 'node:http';
import type { URL } from 'node:url';
import type { z, ZodTypeAny } from 'zod';
import { failure, ok, type Result } from './result.js';

const port = Number(process.env.PORT ?? 3000);

export type Context = {
  request: IncomingMessage;
  response: ServerResponse;
  requestId: string;
  url: URL;
};

export type HttpError = {
  status: number;
  message: string;
};

export type AppResult<T> = Result<T, HttpError>;

export const httpError = (status: number, message: string) =>
  failure({ status, message });

export const parseBody = async <T extends ZodTypeAny>(
  request: IncomingMessage,
  schema: T,
): Promise<AppResult<z.infer<T>>> => {
  let raw = '';
  for await (const chunk of request) raw += chunk;
  let json: unknown = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    return httpError(400, 'Invalid JSON body');
  }
  const parsed = schema.safeParse(json);
  return parsed.success
    ? ok(parsed.data)
    : httpError(400, parsed.error.message);
};

export const requireOrigin = (context: Context) => {
  if (
    !['POST', 'PATCH', 'PUT', 'DELETE'].includes(context.request.method ?? '')
  ) {
    return;
  }
  const origin = context.request.headers.origin;
  if (!origin) return;
  const allowed = process.env.CLIENT_ORIGIN ?? `http://localhost:${port}`;
  if (origin !== allowed) return httpError(403, 'Invalid origin');
};
