/**
 * Secure logger — structured logging with log levels, sensitive data redaction,
 * and configurable minimum level via LOG_LEVEL env var.
 *
 * Set LOG_LEVEL=warn in production to suppress info/debug noise.
 * Supported values: debug | info | warn | error | fatal (default: info in prod, debug in dev)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
  userId?: string;
  requestId?: string;
}

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'session',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'ssn',
  'creditcard',
  'cvv',
] as const;

/** JSON.stringify safe against circular references */
function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  });
}

function redactSensitiveData(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitiveData);

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field));
    redacted[key] = isSensitive
      ? '[REDACTED]'
      : typeof value === 'object'
        ? redactSensitiveData(value)
        : value;
  }
  return redacted;
}

function serializeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: 'UnknownError', message: describeError(error) };
}

/**
 * Estrae un messaggio leggibile da errori non-Error (es. PostgrestError di Supabase:
 * { message, code, details, hint }), che con String(error) darebbero solo "[object Object]".
 */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof err.message === 'string' && err.message) parts.push(err.message);
    if (typeof err.code === 'string' || typeof err.code === 'number') parts.push(`code=${err.code}`);
    if (typeof err.details === 'string' && err.details) parts.push(`details=${err.details}`);
    if (typeof err.hint === 'string' && err.hint) parts.push(`hint=${err.hint}`);
    if (parts.length > 0) return parts.join(' | ');
    return safeStringify(err);
  }
  return String(error);
}

class SecureLogger {
  private readonly isDevelopment: boolean;
  private readonly minLevel: number;
  private readonly boundContext: LogContext;

  constructor(boundContext: LogContext = {}) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.boundContext = boundContext;

    const defaultLevel: LogLevel = this.isDevelopment ? 'debug' : 'info';
    const envLevel = (process.env.LOG_LEVEL ?? defaultLevel) as LogLevel;
    this.minLevel = LOG_LEVEL_PRIORITY[envLevel] ?? LOG_LEVEL_PRIORITY.info;
  }

  /**
   * Create a child logger with pre-bound context.
   * Useful for request-scoped logging without passing userId/requestId to every call.
   *
   * @example
   * const reqLogger = logger.withContext({ userId: user.id, requestId: req.headers['x-request-id'] });
   * reqLogger.info('Booking created', { bookingId });
   */
  public withContext(context: LogContext): SecureLogger {
    return new SecureLogger({ ...this.boundContext, ...context });
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= this.minLevel;
  }

  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context, error, userId, requestId } = entry;

    const logData: Record<string, unknown> = {
      level: level.toUpperCase(),
      timestamp,
      message,
    };

    if (userId) logData.userId = userId;
    if (requestId) logData.requestId = requestId;

    const mergedContext = { ...this.boundContext, ...context };
    if (Object.keys(mergedContext).length > 0) {
      logData.context = redactSensitiveData(mergedContext);
    }

    if (error) {
      // Stack traces are always included — logs are private (Vercel dashboard / server only)
      logData.error = serializeError(error);
    }

    return safeStringify(logData);
  }

  private write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    if (this.isDevelopment) {
      const emojis: Record<LogLevel, string> = {
        debug: '🐛',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        fatal: '💀',
      };
      console.log(
        `${emojis[entry.level]} [${entry.level.toUpperCase()}]`,
        entry.message,
        entry.context ?? ''
      );
      if (entry.error) console.error(entry.error);
      return;
    }

    // Production: structured JSON — captured by Vercel / hosting runtime
    const formatted = this.formatLog(entry);
    switch (entry.level) {
      case 'debug':
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted);
        break;
    }
  }

  public debug(message: string, context?: LogContext): void {
    this.write({ level: 'debug', message, timestamp: new Date().toISOString(), context });
  }

  public info(message: string, context?: LogContext): void {
    this.write({ level: 'info', message, timestamp: new Date().toISOString(), context });
  }

  public warn(message: string, context?: LogContext): void {
    this.write({ level: 'warn', message, timestamp: new Date().toISOString(), context });
  }

  public error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj =
      error instanceof Error ? error : error !== undefined ? new Error(describeError(error)) : undefined;
    this.write({ level: 'error', message, timestamp: new Date().toISOString(), context, error: errorObj });
  }

  public fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj =
      error instanceof Error ? error : error !== undefined ? new Error(describeError(error)) : undefined;
    this.write({ level: 'fatal', message, timestamp: new Date().toISOString(), context, error: errorObj });
  }

  public apiRequest(method: string, path: string, userId?: string, context?: LogContext): void {
    this.info(`API ${method} ${path}`, {
      method,
      path,
      ...(userId && { userId }),
      ...context,
    });
  }

  public apiResponse(method: string, path: string, statusCode: number, duration?: number): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.write({
      level,
      message: `API ${method} ${path} → ${statusCode}`,
      timestamp: new Date().toISOString(),
      context: {
        method,
        path,
        statusCode,
        ...(duration !== undefined && { duration: `${duration}ms` }),
      },
    });
  }

  public dbQuery(query: string, duration?: number): void {
    if (!this.isDevelopment) return;
    this.debug('DB Query', {
      query: query.substring(0, 200),
      ...(duration !== undefined && { duration: `${duration}ms` }),
    });
  }

  public auth(event: string, userId?: string, success = true): void {
    this.write({
      level: success ? 'info' : 'warn',
      message: `Auth: ${event}`,
      timestamp: new Date().toISOString(),
      context: { event, ...(userId && { userId }), success },
    });
  }

  /** Log a security event — always emitted at error level regardless of LOG_LEVEL */
  public security(event: string, context?: LogContext): void {
    // Security events bypass the minLevel filter — always log them
    const entry: LogEntry = {
      level: 'error',
      message: `Security: ${event}`,
      timestamp: new Date().toISOString(),
      context,
    };

    if (this.isDevelopment) {
      console.warn(`🚨 [SECURITY]`, event, context ?? '');
      return;
    }

    console.error(this.formatLog(entry));
  }
}

// Singleton instance
const logger = new SecureLogger();
export default logger;
