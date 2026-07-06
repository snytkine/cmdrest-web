/**
 * Tests for the IndexedDB transport, running against `fake-indexeddb`
 * (installed globally in the test setup), which implements the real
 * IndexedDB API in memory.
 */
import { describe, expect, it, vi } from 'vitest';
import { IndexedDbTransport } from './indexedDbTransport';
import type { LogRecord } from '../types';

/** Builds a minimal record whose message identifies it. */
function makeRecord(message: string): LogRecord {
  return {
    timestamp: new Date().toISOString(),
    level: 'info',
    logger: 'test',
    message,
  };
}

/** Counter so every test gets its own isolated database. */
let dbCounter = 0;

/** Creates a transport bound to a fresh, uniquely-named database. */
function makeTransport(): IndexedDbTransport {
  dbCounter += 1;
  return new IndexedDbTransport({ databaseName: `test-logs-${dbCounter}` });
}

describe('IndexedDbTransport', () => {
  it('persists records and reads them back in insertion order', async () => {
    const transport = makeTransport();
    await transport.write(makeRecord('first'));
    await transport.write(makeRecord('second'));
    const stored = await transport.readAll();
    expect(stored.map((record) => record.message)).toEqual(['first', 'second']);
  });

  it('clear removes every stored record', async () => {
    const transport = makeTransport();
    await transport.write(makeRecord('doomed'));
    await transport.clear();
    expect(await transport.readAll()).toEqual([]);
  });

  it('supports a custom store name', async () => {
    dbCounter += 1;
    const transport = new IndexedDbTransport({
      databaseName: `test-logs-${dbCounter}`,
      storeName: 'custom-store',
    });
    await transport.write(makeRecord('custom'));
    const stored = await transport.readAll();
    expect(stored).toHaveLength(1);
  });

  it('disables itself instead of throwing when IndexedDB is unavailable', async () => {
    const transport = makeTransport();
    // Simulate a locked-down environment with no IndexedDB at all.
    vi.stubGlobal('indexedDB', undefined);
    try {
      // The first write hits the failure and must swallow it...
      await expect(transport.write(makeRecord('lost'))).resolves.toBeUndefined();
      // ...and subsequent writes are silent no-ops on the disabled transport.
      await expect(transport.write(makeRecord('also lost'))).resolves.toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
