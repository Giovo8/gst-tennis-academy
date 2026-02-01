/**
 * Enhanced secure logger
 * Structured logging with log levels and sensitive data filtering
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  [key: string]: any;
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

class SecureLogger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  // Sensitive fields to redact from logs
  private sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'session',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'ssn',
    'creditCard',
    'cvv',
  ];

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Redact sensitive data from objects
   */
  private redactSensitiveData(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactSensitiveData(item));
    }

    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.sensitiveFields.some((field) =>
        lowerKey.includes(field.toLowerCase())
      );

      if (isSensitive) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        redacted[key] = this.redactSensitiveData(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Format log entry
   */
  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context, error, userId, requestId } = entry;

    const logData: any = {
      level: level.toUpperCase(),
      timestamp,
      message,
    };

    if (userId) logData.userId = userId;
    if (requestId) logData.requestId = requestId;
    if (context) logData.context = this.redactSensitiveData(context);
    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    }

    return JSON.stringify(logData);
  }

  /**
   * Write log to appropriate destination
   */
  private write(entry: LogEntry): void {
    const formatted = this.formatLog(entry);

    // In production, send to external logging service (e.g., Sentry, DataDog)
    if (this.isProduction) {
      // TODO: Integrate with external logging service
      // For now, use console in structured format
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
    } else {
      // Development: pretty print
      const emoji = this.getLevelEmoji(entry.level);
      console.log(`${emoji} [${entry.level.toUpperCase()}]`, entry.message, entry.context || '');
      if (entry.error) {
        console.error(entry.error);
      }
    }
  }

  /**
   * Get emoji for log level (development only)
   */
  private getLevelEmoji(level: LogLevel): string {
    const emojis = {
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      fatal: '💀',
    };
    return emojis[level];
  }

  /**
   * Debug level logging (development only)
   */
  public debug(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;

    this.write({
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      context,
    });
  }

  /**
   * Info level logging
   */
  public info(message: string, context?: LogContext): void {
    this.write({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context,
    });
  }

  /**
   * Warning level logging
   */
  public warn(message: string, context?: LogContext): void {
    this.write({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context,
    });
  }

  /**
   * Error level logging
   */
  public error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    this.write({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context,
      error: errorObj,
    });
  }

  /**
   * Fatal level logging (critical errors)
   */
  public fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    this.write({
      level: 'fatal',
      message,
      timestamp: new Date().toISOString(),
      context,
      error: errorObj,
    });
  }

  /**
   * Log API request
   */
  public apiRequest(
    method: string,
    path: string,
    userId?: string,
    context?: LogContext
  ): void {
    this.info(`API Request: ${method} ${path}`, {
      method,
      path,
      userId,
      ...context,
    });
  }

  /**
   * Log API response
   */
  public apiResponse(
    method: string,
    path: string,
    statusCode: number,
    duration?: number
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    this.write({
      level,
      message: `API Response: ${method} ${path} - ${statusCode}`,
      timestamp: new Date().toISOString(),
      context: {
        method,
        path,
        statusCode,
        duration: duration ? `${duration}ms` : undefined,
      },
    });
  }

  /**
   * Log database query (development only)
   */
  public dbQuery(query: string, duration?: number): void {
    if (!this.isDevelopment) return;

    this.debug('Database Query', {
      query: query.substring(0, 200), // Truncate long queries
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  /**
   * Log authentication event
   */
  public auth(event: string, userId?: string, success: boolean = true): void {
    const level = success ? 'info' : 'warn';
    
    this.write({
      level,
      message: `Auth: ${event}`,
      timestamp: new Date().toISOString(),
      context: {
        event,
        userId,
        success,
      },
    });
  }

  /**
   * Log security event
   */
  public security(event: string, context?: LogContext): void {
    this.warn(`Security Event: ${event}`, context);
  }
}

// Singleton instance
const logger = new SecureLogger();

export default logger;
