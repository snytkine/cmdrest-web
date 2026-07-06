/**
 * localStorage transport: persists log records to `window.localStorage`.
 *
 * Records are stored as a single JSON array under a configurable key and
 * capped at a maximum number of entries (oldest entries are dropped first)
 * so the transport can never exhaust the storage quota through unbounded
 * growth. All storage failures are swallowed — logging must never break
 * the application.
 */
import type { LogRecord, LogTransport } from '../types';

/** Configuration options for {@link LocalStorageTransport}. */
export interface LocalStorageTransportOptions {
  /** Storage key the log array is kept under. Default: `cmdrest.logs`. */
  readonly storageKey?: string;
  /** Maximum number of records retained. Default: 500. */
  readonly maxEntries?: number;
}

/** Transport that appends log records to a capped array in localStorage. */
export class LocalStorageTransport implements LogTransport {
  public readonly name = 'localStorage';

  private readonly storageKey: string;
  private readonly maxEntries: number;

  public constructor(options: LocalStorageTransportOptions = {}) {
    this.storageKey = options.storageKey ?? 'cmdrest.logs';
    this.maxEntries = options.maxEntries ?? 500;
  }

  /** Appends one record, trimming the array to `maxEntries` if needed. */
  public write(record: LogRecord): void {
    try {
      const existing = this.read();
      existing.push(record);
      // Drop the oldest entries once the cap is exceeded so storage
      // usage stays bounded no matter how long the session runs.
      const trimmed =
        existing.length > this.maxEntries ? existing.slice(existing.length - this.maxEntries) : existing;
      window.localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
    } catch {
      // Quota exceeded, storage disabled (private mode), or serialization
      // failure — deliberately ignored so logging never throws.
    }
  }

  /**
   * Reads all currently stored records.
   * Returns an empty array when the key is missing or holds invalid JSON.
   */
  public read(): LogRecord[] {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (raw === null) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      // Guard against foreign data under our key: only accept arrays.
      return Array.isArray(parsed) ? (parsed as LogRecord[]) : [];
    } catch {
      return [];
    }
  }

  /** Removes all stored records. */
  public clear(): void {
    try {
      window.localStorage.removeItem(this.storageKey);
    } catch {
      // Storage disabled — nothing to clear.
    }
  }
}
