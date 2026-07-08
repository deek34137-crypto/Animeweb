// src/lib/logger.ts

import { getRequestContext } from './requestContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  version: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  context?: Record<string, unknown>;
}

export type Transport = (entry: LogEntry) => void;

// ─── Configuration ───────────────────────────────────────────────────────────

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';

const configuredLevel: LogLevel = (() => {
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVELS) return envLevel;
  return isProduction ? 'info' : 'debug';
})();

const SERVICE_NAME = 'aniworld';
const APP_VERSION = process.env.APP_VERSION || '0.1.0';

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatJSON(entry: LogEntry): string {
  return JSON.stringify(entry);
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',  // cyan
  info: '\x1b[32m',   // green
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
};
const RESET = '\x1b[0m';

function formatPretty(entry: LogEntry): string {
  const color = LEVEL_COLORS[entry.level];
  const level = entry.level.toUpperCase().padEnd(5);
  const prefix = `${color}[${level}]${RESET}`;
  const rid = entry.requestId ? ` ${RESET}\x1b[90m(${entry.requestId.slice(0, 8)})${RESET}` : '';
  const ctx = entry.context && Object.keys(entry.context).length > 0
    ? ` ${RESET}\x1b[90m${JSON.stringify(entry.context)}${RESET}`
    : '';
  return `${prefix}${rid} ${entry.message}${ctx}`;
}

// ─── Default Transport ───────────────────────────────────────────────────────

const consoleTransport: Transport = (entry: LogEntry) => {
  const formatted = isProduction ? formatJSON(entry) : formatPretty(entry);
  if (entry.level === 'error') {
    console.error(formatted);
  } else if (entry.level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
};

// ─── Logger ──────────────────────────────────────────────────────────────────

let activeTransports: Transport[] = [consoleTransport];

/**
 * Adds an additional transport. Does not remove the default console transport.
 */
export function addTransport(transport: Transport): void {
  activeTransports.push(transport);
}

/**
 * Replaces all transports with the provided list.
 */
export function setTransports(transports: Transport[]): void {
  activeTransports = transports;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
}

function normalizeContext(...args: unknown[]): Record<string, unknown> | undefined {
  if (args.length === 0) return undefined;

  // Single Record argument — use directly
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !(args[0] instanceof Error)) {
    return args[0] as Record<string, unknown>;
  }

  // Single Error argument
  if (args.length === 1 && args[0] instanceof Error) {
    return { error: args[0].message, stack: args[0].stack };
  }

  // Mixed args — collect into an extras array, extracting any Error objects
  const result: Record<string, unknown> = {};
  const extras: unknown[] = [];
  for (const arg of args) {
    if (arg instanceof Error) {
      result.error = arg.message;
      result.stack = arg.stack;
    } else if (typeof arg === 'object' && arg !== null) {
      Object.assign(result, arg);
    } else {
      extras.push(arg);
    }
  }
  if (extras.length > 0) {
    result.extras = extras;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (!shouldLog(level)) return;

  const reqCtx = getRequestContext();
  const context = normalizeContext(...args);

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: SERVICE_NAME,
    environment,
    version: APP_VERSION,
    requestId: reqCtx?.requestId,
    context,
  };

  for (const transport of activeTransports) {
    try {
      transport(entry);
    } catch {
      // Transport failure must not crash the application
    }
  }
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => log('debug', message, ...args),
  info: (message: string, ...args: unknown[]) => log('info', message, ...args),
  warn: (message: string, ...args: unknown[]) => log('warn', message, ...args),
  error: (message: string, ...args: unknown[]) => log('error', message, ...args),
};
