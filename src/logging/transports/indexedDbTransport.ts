/**
 * IndexedDB transport: persists log records to a browser IndexedDB store.
 *
 * IndexedDB is asynchronous, so the transport opens the database lazily on
 * the first write and serializes writes through a single promise chain.
 * Any failure (IndexedDB unavailable, blocked, quota exceeded) permanently
 * disables the transport instead of throwing — logging must never break
 * the application.
 */
import type { LogRecord, LogTransport } from '../types';

/** Configuration options for {@link IndexedDbTransport}. */
export interface IndexedDbTransportOptions {
  /** Database name. Default: `cmdrest-logs`. */
  readonly databaseName?: string;
  /** Object store name inside the database. Default: `logs`. */
  readonly storeName?: string;
}

/** Transport that appends log records to an IndexedDB object store. */
export class IndexedDbTransport implements LogTransport {
  public readonly name = 'indexedDB';

  private readonly databaseName: string;
  private readonly storeName: string;
  /** Lazily-created database connection; null until the first write. */
  private databasePromise: Promise<IDBDatabase> | null = null;
  /** Set to true after an unrecoverable failure; all writes become no-ops. */
  private disabled = false;

  public constructor(options: IndexedDbTransportOptions = {}) {
    this.databaseName = options.databaseName ?? 'cmdrest-logs';
    this.storeName = options.storeName ?? 'logs';
  }

  /** Writes one record; resolves once the transaction completes. */
  public async write(record: LogRecord): Promise<void> {
    if (this.disabled) {
      return;
    }
    try {
      const db = await this.openDatabase();
      await this.runTransaction(db, 'readwrite', (store) => store.add(record));
    } catch {
      // Unrecoverable IndexedDB failure: disable the transport so we do
      // not retry (and fail) on every subsequent log call.
      this.disabled = true;
    }
  }

  /** Reads back every stored record (used by tests and debug tooling). */
  public async readAll(): Promise<LogRecord[]> {
    const db = await this.openDatabase();
    return new Promise<LogRecord[]>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const request = tx.objectStore(this.storeName).getAll();
      request.onsuccess = () => resolve(request.result as LogRecord[]);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
    });
  }

  /** Deletes every stored record. */
  public async clear(): Promise<void> {
    const db = await this.openDatabase();
    await this.runTransaction(db, 'readwrite', (store) => store.clear());
  }

  /**
   * Opens (and memoizes) the database connection, creating the object
   * store on first use via the `onupgradeneeded` callback.
   */
  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise === null) {
      this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
        // `indexedDB` may be undefined in very old browsers or locked-down
        // contexts; treat that as an immediate, permanent failure.
        if (typeof indexedDB === 'undefined') {
          reject(new Error('IndexedDB is not available'));
          return;
        }
        const request = indexedDB.open(this.databaseName, 1);
        request.onupgradeneeded = () => {
          // Auto-incrementing key keeps insertion order without requiring
          // records to carry their own unique identifier.
          request.result.createObjectStore(this.storeName, { autoIncrement: true });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
      });
    }
    return this.databasePromise;
  }

  /**
   * Runs a single-store transaction and resolves when it commits.
   * The `operate` callback issues the actual request against the store.
   */
  private runTransaction(
    db: IDBDatabase,
    mode: IDBTransactionMode,
    operate: (store: IDBObjectStore) => IDBRequest,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, mode);
      operate(tx.objectStore(this.storeName));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
  }
}
