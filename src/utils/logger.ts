import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

interface LogContext {
  [key: string]: any;
}

// Get the directory where index.js is located (dist/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = dirname(__dirname); // Go up from utils/ to dist/
const logsDir = join(distDir, 'logs');
const logFilePath = join(logsDir, 'app.log');

// Map environment log level to pino level
function getPinoLevel(): pino.Level {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  switch (envLevel) {
    case 'debug':
      return 'debug';
    case 'info':
      return 'info';
    case 'warn':
      return 'warn';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
}

// Create file transport using pino.transport()
const transport = pino.transport({
  target: 'pino/file',
  options: {
    destination: logFilePath,
    mkdir: true,
  },
});

// Create pino logger with file transport
const pinoLogger = pino(
  {
    level: getPinoLevel(),
  },
  transport
);

// Store original console methods before overriding
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

// Override console methods to route to pino
function overrideConsoleMethods(): void {
  console.log = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    pinoLogger.info({ source: 'console.log' }, message);
  };

  console.info = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    pinoLogger.info({ source: 'console.info' }, message);
  };

  console.warn = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    pinoLogger.warn({ source: 'console.warn' }, message);
  };

  console.error = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    pinoLogger.error({ source: 'console.error' }, message);
  };

  console.debug = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    pinoLogger.debug({ source: 'console.debug' }, message);
  };
}

// Apply console overrides
overrideConsoleMethods();

class Logger {
  debug(message: string, context?: LogContext) {
    if (context) {
      pinoLogger.debug(context, message);
    } else {
      pinoLogger.debug(message);
    }
  }

  info(message: string, context?: LogContext) {
    if (context) {
      pinoLogger.info(context, message);
    } else {
      pinoLogger.info(message);
    }
  }

  warn(message: string, context?: LogContext) {
    if (context) {
      pinoLogger.warn(context, message);
    } else {
      pinoLogger.warn(message);
    }
  }

  error(message: string, context?: LogContext) {
    if (context) {
      pinoLogger.error(context, message);
    } else {
      pinoLogger.error(message);
    }
  }

  toolCall(toolName: string, success: boolean, duration: number, context?: LogContext) {
    this.info(`Tool ${toolName} ${success ? 'succeeded' : 'failed'}`, {
      tool: toolName,
      success,
      duration: `${duration}ms`,
      ...context
    });
  }

  apiCall(endpoint: string, method: string, status: number, duration: number, rateLimit?: any) {
    this.debug(`API ${method} ${endpoint}`, {
      method,
      endpoint,
      status,
      duration: `${duration}ms`,
      rateLimit
    });
  }
}

export const logger = new Logger();
export const pino_logger = pinoLogger;
export { originalConsole };
export type { LogContext };