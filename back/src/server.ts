import { randomUUID } from 'node:crypto';
import http, { type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { handle } from './app.js';
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
    .then((result) => {
      if (response.writableEnded) return;
      if (result.ok) {
        send(response, 200, result.value, requestId);
        return;
      }
      const { status, message } = result.error;
      logger.warn('request failed', {
        requestId,
        method: request.method,
        path: url.pathname,
        status,
        error: message,
      });
      send(response, status, { error: message, message, requestId }, requestId);
    })
    .catch((error: unknown) => {
      const message = 'Internal server error';
      logger.error('unexpected request failure', {
        requestId,
        method: request.method,
        path: url.pathname,
        status: 500,
        error: error instanceof Error ? error.message : String(error),
      });
      if (!response.writableEnded) {
        send(response, 500, { error: message, message, requestId }, requestId);
      }
    });
});

server.listen(port, () => {
  logger.info('server started', { port });
});
