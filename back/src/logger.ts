const SENSITIVE_KEYS = new Set([
  'password',
  'card',
  'token',
  'authorization',
  'cookie',
  'pan',
  'cvv',
  'expiry',
]);

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const colors: Record<LogLevel, string> = {
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

const reset = '\x1b[0m';

const clean = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clean);

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[redacted]' : clean(item);
  }
  return output;
};

const write = (
  level: LogLevel,
  context: string,
  message: string,
  meta: Record<string, unknown> = {},
) => {
  const metaClean = clean(meta) as Record<string, unknown>;
  const line = {
    level,
    context,
    message,
    time: new Date().toISOString(),
    ...metaClean,
  };
  const prefix = process.env.NODE_ENV === 'production' ? '' : colors[level];
  const suffix = process.env.NODE_ENV === 'production' ? '' : reset;
  const stream = level === 'warn' || level === 'error' ? process.stderr : process.stdout;
  stream.write(`${prefix}${JSON.stringify(line)}${suffix}\n`);
};

export const createLogger = (context: string) => ({
  debug: (message: string, meta?: Record<string, unknown>) =>
    write('debug', context, message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    write('info', context, message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    write('warn', context, message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    write('error', context, message, meta),
});
