/**
 * Tests for the localStorage transport: persistence, retention cap and
 * graceful handling of storage failures / corrupted data.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageTransport } from './localStorageTransport';
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

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('LocalStorageTransport', () => {
  it('persists records and reads them back', () => {
    const transport = new LocalStorageTransport();
    transport.write(makeRecord('first'));
    transport.write(makeRecord('second'));
    expect(transport.read().map((record) => record.message)).toEqual(['first', 'second']);
  });

  it('uses a custom storage key when configured', () => {
    const transport = new LocalStorageTransport({ storageKey: 'my.logs' });
    transport.write(makeRecord('entry'));
    // The record must live under the custom key, not the default one.
    expect(window.localStorage.getItem('my.logs')).toContain('entry');
    expect(window.localStorage.getItem('cmdrest.logs')).toBeNull();
  });

  it('drops the oldest entries beyond maxEntries', () => {
    const transport = new LocalStorageTransport({ maxEntries: 3 });
    for (const message of ['a', 'b', 'c', 'd', 'e']) {
      transport.write(makeRecord(message));
    }
    // Only the 3 newest survive, in order.
    expect(transport.read().map((record) => record.message)).toEqual(['c', 'd', 'e']);
  });

  it('returns an empty array for corrupted JSON', () => {
    window.localStorage.setItem('cmdrest.logs', '{not json');
    expect(new LocalStorageTransport().read()).toEqual([]);
  });

  it('returns an empty array when the key holds a non-array value', () => {
    window.localStorage.setItem('cmdrest.logs', '{"foreign":"object"}');
    expect(new LocalStorageTransport().read()).toEqual([]);
  });

  it('swallows storage write failures (quota exceeded)', () => {
    const transport = new LocalStorageTransport();
    // Simulate the browser rejecting the write (e.g. quota exceeded).
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => transport.write(makeRecord('lost'))).not.toThrow();
  });

  it('clear removes all stored records', () => {
    const transport = new LocalStorageTransport();
    transport.write(makeRecord('gone'));
    transport.clear();
    expect(transport.read()).toEqual([]);
    expect(window.localStorage.getItem('cmdrest.logs')).toBeNull();
  });
});
