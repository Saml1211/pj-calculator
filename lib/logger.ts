const isDev = process.env.NODE_ENV !== 'production';

function formatMessage(level: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level}] ${message}`;
  if (data !== undefined) {
    return `${base} ${JSON.stringify(data, null, 2)}`;
  }
  return base;
}

export const logger = {
  info(message: string, data?: unknown): void {
    console.log(formatMessage('INFO', message, data));
  },
  warn(message: string, data?: unknown): void {
    console.warn(formatMessage('WARN', message, data));
  },
  error(message: string, data?: unknown): void {
    console.error(formatMessage('ERROR', message, data));
  },
  debug(message: string, data?: unknown): void {
    if (isDev) {
      console.log(formatMessage('DEBUG', message, data));
    }
  },
};
