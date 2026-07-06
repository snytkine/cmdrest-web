/**
 * The site's logging facade, built on the `loglevel` library.
 *
 * `loglevel` provides named loggers with per-logger severity levels; this
 * module replaces its method factory so that every log call is converted
 * into a structured {@link LogRecord} and fanned out to a registry of
 * pluggable transports:
 *
 * - {@link ConsoleTransport} (registered by default) prints to the console.
 * - {@link LocalStorageTransport} and {@link IndexedDbTransport} can be
 *   added with {@link addTransport} to persist usage logs in the browser.
 *
 * Usage:
 * ```ts
 * const log = getLogger('ui');
 * log.info('Download button clicked', { os: 'macos' });
 * ```
 */
import log from 'loglevel';
import type { LogLevelName, LogRecord, LogTransport } from './types';
import { ConsoleTransport } from './transports/consoleTransport';

/** Registry of active transports, keyed by transport name. */
const transports = new Map<string, LogTransport>();

/** All valid level names, used to narrow loglevel's method names. */
const LEVEL_NAMES: readonly LogLevelName[] = ['trace', 'debug', 'info', 'warn', 'error'];

/**
 * Type guard narrowing an arbitrary loglevel method name to one of the
 * five severities (loglevel also exposes e.g. `log` as an alias).
 */
function isLogLevelName(value: string): value is LogLevelName {
  return (LEVEL_NAMES as readonly string[]).includes(value);
}

/**
 * Builds a structured record from the raw arguments of a log call.
 * The first argument becomes the message (stringified when it is not a
 * string); remaining arguments are attached as `data` (unwrapped when
 * there is exactly one).
 */
export function buildRecord(level: LogLevelName, loggerName: string, args: unknown[]): LogRecord {
  const [first, ...rest] = args;
  // Non-string first arguments (objects, errors) are serialized so the
  // record's message is always readable text.
  const message = typeof first === 'string' ? first : safeStringify(first);
  const record: LogRecord = {
    timestamp: new Date().toISOString(),
    level,
    logger: loggerName,
    message,
    // Attach extra arguments: a single extra arg is stored as-is,
    // multiple extras are stored as an array.
    ...(rest.length === 1 ? { data: rest[0] } : rest.length > 1 ? { data: rest } : {}),
  };
  return record;
}

/**
 * JSON-stringifies a value, falling back to `String(value)` for values
 * JSON cannot represent (circular structures, BigInt, undefined).
 */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Fans a record out to every registered transport. Each transport call is
 * individually guarded: one broken transport must not prevent the others
 * from receiving the record, and logging must never throw into app code.
 */
function dispatch(record: LogRecord): void {
  for (const transport of transports.values()) {
    try {
      // Fire-and-forget: async transports (IndexedDB) handle their own
      // failures; we intentionally do not await them on the hot path.
      void transport.write(record);
    } catch {
      // Swallow synchronous transport errors.
    }
  }
}

/**
 * Replace loglevel's method factory so every enabled log method builds a
 * structured record and dispatches it to the transports instead of writing
 * to the console directly (console output is handled by ConsoleTransport).
 */
log.methodFactory = (methodName, _level, loggerName) => {
  // loglevel allows symbol logger names; normalize to a display string.
  const name =
    typeof loggerName === 'string' ? loggerName : loggerName === undefined ? 'root' : String(loggerName);
  const level: LogLevelName = isLogLevelName(methodName) ? methodName : 'info';
  return (...args: unknown[]) => {
    dispatch(buildRecord(level, name, args));
  };
};

// Default severity: verbose in dev builds, warnings-and-up in production.
// `rebuild` applies the new method factory to the root logger and any
// child loggers created later inherit it automatically.
log.setDefaultLevel(import.meta.env?.DEV ? 'debug' : 'warn');
log.rebuild();

// The console transport is always on by default so developers see logs
// in devtools without any configuration.
transports.set('console', new ConsoleTransport());

/**
 * Returns a named logger. Loggers are cached by loglevel, so calling this
 * repeatedly with the same name returns the same instance.
 */
export function getLogger(name: string): log.Logger {
  return log.getLogger(name);
}

/**
 * Registers a transport (replacing any existing transport with the same
 * name). Use this to direct logs to localStorage or IndexedDB:
 * `addTransport(new LocalStorageTransport())`.
 */
export function addTransport(transport: LogTransport): void {
  transports.set(transport.name, transport);
}

/** Removes a transport by name. Returns true when one was removed. */
export function removeTransport(name: string): boolean {
  return transports.delete(name);
}

/** Returns the names of all currently registered transports. */
export function getTransportNames(): string[] {
  return [...transports.keys()];
}

/**
 * Sets the severity for the root logger and all existing named loggers.
 * Messages below this level are dropped before they reach any transport.
 */
export function setGlobalLevel(level: LogLevelName): void {
  log.setLevel(level);
  // Named loggers each carry their own level, so propagate explicitly.
  for (const logger of Object.values(log.getLoggers())) {
    logger.setLevel(level);
  }
}

/** Dedicated logger for user-interaction and navigation events. */
const interactionLogger = log.getLogger('ui');

/**
 * Records a user interaction (clicks, menu toggles, outbound links).
 * Centralized here so components log consistently-shaped events.
 */
export function logInteraction(action: string, data?: Record<string, unknown>): void {
  if (data !== undefined) {
    interactionLogger.info(action, data);
  } else {
    interactionLogger.info(action);
  }
}

/** Records a page view whenever the router navigates to a new path. */
export function logPageView(path: string): void {
  interactionLogger.info('page-view', { path });
}
