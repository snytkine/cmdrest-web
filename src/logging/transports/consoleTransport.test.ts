/**
 * Tests for the console transport: correct console method selection
 * and message formatting.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsoleTransport } from './consoleTransport';
import type { LogRecord } from '../types';

/** Builds a log record with sane defaults for these tests. */
function makeRecord(overrides: Partial<LogRecord> = {}): LogRecord {
  return {
    timestamp: '2026-07-05T12:34:56.789Z',
    level: 'info',
    logger: 'test',
    message: 'hello',
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConsoleTransport', () => {
  it('formats the prefix as [time] LEVEL [logger]', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    new ConsoleTransport().write(makeRecord());
    expect(spy).toHaveBeenCalledWith('[12:34:56] INFO [test] hello');
  });

  it('passes structured data through as a second console argument', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    new ConsoleTransport().write(makeRecord({ level: 'warn', data: { a: 1 } }));
    expect(spy).toHaveBeenCalledWith('[12:34:56] WARN [test] hello', { a: 1 });
  });

  it.each([
    // [record level, expected console method]
    ['trace', 'debug'],
    ['debug', 'debug'],
    ['info', 'info'],
    ['warn', 'warn'],
    ['error', 'error'],
  ] as const)('routes %s records to console.%s', (level, method) => {
    const spy = vi.spyOn(console, method).mockImplementation(() => undefined);
    new ConsoleTransport().write(makeRecord({ level }));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
