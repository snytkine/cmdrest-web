/**
 * Console transport: writes structured log records to the browser console.
 *
 * This is the default transport registered by the logger. It formats each
 * record as `[HH:MM:SS] LEVEL [logger] message` and picks the matching
 * console method so browser devtools can filter by severity.
 */
import type { LogLevelName, LogRecord, LogTransport } from '../types';

/**
 * Maps a log level to the corresponding `console` method.
 * `trace` intentionally maps to `console.debug` to avoid the noisy
 * stack trace that `console.trace` prints for every entry.
 */
const CONSOLE_METHOD: Record<LogLevelName, 'debug' | 'info' | 'warn' | 'error'> = {
  trace: 'debug',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

/** Transport that prints log records to the browser console. */
export class ConsoleTransport implements LogTransport {
  public readonly name = 'console';

  /** Formats and prints a single record to the console. */
  public write(record: LogRecord): void {
    // Keep only the time portion of the ISO timestamp for readability.
    const time = record.timestamp.slice(11, 19);
    const prefix = `[${time}] ${record.level.toUpperCase()} [${record.logger}]`;

    const method = CONSOLE_METHOD[record.level];
    // Only pass `data` through when present so the console stays clean
    // for plain-message log calls.
    if (record.data !== undefined) {
      console[method](`${prefix} ${record.message}`, record.data);
    } else {
      console[method](`${prefix} ${record.message}`);
    }
  }
}
