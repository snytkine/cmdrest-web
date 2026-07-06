/**
 * Shared types for the site's logging framework.
 *
 * The framework is built on top of `loglevel` (a small, well-known logging
 * library designed for browsers). Every log call is converted into a
 * structured {@link LogRecord} and dispatched to a set of pluggable
 * {@link LogTransport}s — console by default, with optional localStorage
 * and IndexedDB backends.
 */

/** The five log severities supported by loglevel, lowest to highest. */
export type LogLevelName = 'trace' | 'debug' | 'info' | 'warn' | 'error';

/** A single structured log entry produced by a logger call. */
export interface LogRecord {
  /** ISO-8601 timestamp of when the entry was created. */
  readonly timestamp: string;
  /** Severity of the entry. */
  readonly level: LogLevelName;
  /** Name of the logger that produced the entry (e.g. "ui", "router"). */
  readonly logger: string;
  /** Human-readable message. */
  readonly message: string;
  /** Optional structured payload attached to the entry. */
  readonly data?: unknown;
}

/**
 * A destination that log records are written to.
 *
 * Implementations must never throw from {@link write}: logging must never
 * break the application. The dispatcher additionally guards each call,
 * but transports should handle their own failure modes (e.g. storage
 * quota exceeded) gracefully.
 */
export interface LogTransport {
  /** Unique transport name, used for registration/removal. */
  readonly name: string;
  /** Persist or display a single log record. May be async (fire-and-forget). */
  write(record: LogRecord): void | Promise<void>;
}
