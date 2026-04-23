type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

function formatEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}`;
  if (entry.data !== undefined) {
    return `${base} ${JSON.stringify(entry.data)}`;
  }
  return base;
}

function createLogFn(level: LogLevel) {
  return (message: string, data?: unknown) => {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };
    const formatted = formatEntry(entry);

    switch (level) {
      case 'error':
        process.stderr.write(formatted + '\n');
        break;
      case 'warn':
        process.stderr.write(formatted + '\n');
        break;
      default:
        process.stdout.write(formatted + '\n');
        break;
    }
  };
}

export const logger = {
  debug: createLogFn('debug'),
  info: createLogFn('info'),
  warn: createLogFn('warn'),
  error: createLogFn('error'),
} as const;
