// src/lib/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const getCurrentLogLevel = (): LogLevel => {
  const level = process.env.LOG_LEVEL || 'info';
  return level as LogLevel;
};

const shouldLog = (level: LogLevel): boolean => {
  const currentLevel = getCurrentLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
};

const formatLogEntry = (entry: LogEntry): string => {
  const { timestamp, level, message, context, error } = entry;
  let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (context && Object.keys(context).length > 0) {
    log += ` ${JSON.stringify(context)}`;
  }
  
  if (error) {
    log += ` - Error: ${error.message}`;
    if (error.stack && process.env.NODE_ENV !== 'production') {
      log += `\n${error.stack}`;
    }
  }
  
  return log;
};

export const logger = {
  debug(message: string, context?: Record<string, any>) {
    if (!shouldLog('debug')) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLogEntry(entry));
    }
  },

  info(message: string, context?: Record<string, any>) {
    if (!shouldLog('info')) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    };
    
    console.log(formatLogEntry(entry));
  },

  warn(message: string, context?: Record<string, any>) {
    if (!shouldLog('warn')) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
    };
    
    console.warn(formatLogEntry(entry));
  },

  error(message: string, error?: Error, context?: Record<string, any>) {
    if (!shouldLog('error')) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      error: error ? {
        message: error.message,
        stack: error.stack,
      } : undefined,
    };
    
    console.error(formatLogEntry(entry));
    
    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      // TODO: Implement Sentry integration
      // Sentry.captureException(error, { extra: context });
    }
  },
};
