import { randomUUID } from 'node:crypto';
import http, { type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { ZodError } from 'zod';
import { handle, HttpError } from './app.js';
import { createLogger } from './logger.js';

const logger = createLogger('http');
const port = Number(process.env.PORT ?? 3000);

const send = (
  response: ServerResponse,
  status: number,
  body: unknown,
  requestId: string,
) => {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
  });
  response.end(JSON.stringify(body));
};

const server = http.createServer((request, response) => {
  const requestId = request.headers['x-request-id']?.toString() ?? randomUUID();
  const host = request.headers.host ?? `localhost:${port}`;
  const url = new URL(request.url ?? '/', `http://${host}`);
  const context = { request, response, requestId, url };

  handle(context)
    .then((body) => {
      if (!response.writableEnded) send(response, 200, body, requestId);
    })
    .catch((error: unknown) => {
      const status =
        error instanceof HttpError
          ? error.status
          : error instanceof ZodError
            ? 400
            : 500;
      const message =
        error instanceof HttpError || error instanceof ZodError
          ? error.message
          : 'Internal server error';

      logger[status >= 500 ? 'error' : 'warn']('request failed', {
        requestId,
        method: request.method,
        path: url.pathname,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
      send(response, status, { error: message, message, requestId }, requestId);
    });
});

server.listen(port, () => {
  logger.info('server started', { port });
});
