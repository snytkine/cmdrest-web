/**
 * Tests for the logging facade (`logger.ts`): record construction,
 * transport registration/dispatch, level filtering and the interaction
 * helpers.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addTransport,
  buildRecord,
  getLogger,
  getTransportNames,
  logInteraction,
  logPageView,
  removeTransport,
  setGlobalLevel,
} from './logger';
import { ConsoleTransport } from './transports/consoleTransport';
import { CaptureTransport } from '../test/helpers';
import type { LogRecord } from './types';

/** Fresh capture transport installed before each test. */
let capture: CaptureTransport;

beforeEach(() => {
  // Remove the default console transport so tests stay silent, and
  // install a capture transport we can assert against.
  removeTransport('console');
  capture = new CaptureTransport();
  addTransport(capture);
  // Ensure everything down to trace reaches the transports.
  setGlobalLevel('trace');
});

afterEach(() => {
  removeTransport('capture');
  // Restore the default console transport for other test files.
  addTransport(new ConsoleTransport());
  setGlobalLevel('trace');
});

describe('buildRecord', () => {
  it('uses a string first argument as the message', () => {
    const record = buildRecord('info', 'test', ['hello world']);
    expect(record.message).toBe('hello world');
    expect(record.level).toBe('info');
    expect(record.logger).toBe('test');
    // No extra arguments means no data property at all.
    expect(record.data).toBeUndefined();
  });

  it('stringifies a non-string first argument', () => {
    const record = buildRecord('warn', 'test', [{ code: 42 }]);
    expect(record.message).toBe('{"code":42}');
  });

  it('falls back to String() for values JSON cannot represent', () => {
    // Circular structures make JSON.stringify throw.
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    const record = buildRecord('error', 'test', [circular]);
    expect(record.message).toBe('[object Object]');
  });

  it('attaches a single extra argument as data', () => {
    const record = buildRecord('info', 'test', ['msg', { os: 'linux' }]);
    expect(record.data).toEqual({ os: 'linux' });
  });

  it('attaches multiple extra arguments as an array', () => {
    const record = buildRecord('info', 'test', ['msg', 1, 2]);
    expect(record.data).toEqual([1, 2]);
  });

  it('stamps an ISO-8601 timestamp', () => {
    const record = buildRecord('info', 'test', ['msg']);
    // Round-tripping through Date proves the timestamp parses.
    expect(new Date(record.timestamp).toISOString()).toBe(record.timestamp);
  });
});

describe('transport registry', () => {
  it('registers and removes transports by name', () => {
    expect(getTransportNames()).toContain('capture');
    expect(removeTransport('capture')).toBe(true);
    expect(getTransportNames()).not.toContain('capture');
    // Removing a missing transport reports false.
    expect(removeTransport('capture')).toBe(false);
    addTransport(capture);
  });

  it('dispatches records to registered transports', () => {
    getLogger('dispatch-test').info('event happened', { id: 7 });
    expect(capture.records).toHaveLength(1);
    const record = capture.records[0] as LogRecord;
    expect(record.logger).toBe('dispatch-test');
    expect(record.level).toBe('info');
    expect(record.message).toBe('event happened');
    expect(record.data).toEqual({ id: 7 });
  });

  it('keeps dispatching when one transport throws', () => {
    // A transport whose write always fails must not break the others.
    addTransport({
      name: 'broken',
      write: () => {
        throw new Error('transport exploded');
      },
    });
    expect(() => getLogger('resilience').error('still logged')).not.toThrow();
    expect(capture.records.some((r) => r.message === 'still logged')).toBe(true);
    removeTransport('broken');
  });
});

describe('level filtering', () => {
  it('drops records below the global level', () => {
    setGlobalLevel('error');
    getLogger('filtered').info('too quiet');
    expect(capture.records).toHaveLength(0);
    // Errors still pass through.
    getLogger('filtered').error('loud enough');
    expect(capture.records.map((r) => r.message)).toEqual(['loud enough']);
  });
});

describe('interaction helpers', () => {
  it('logInteraction produces an info record on the ui logger', () => {
    logInteraction('cta-click', { target: 'download' });
    const record = capture.records[0] as LogRecord;
    expect(record.logger).toBe('ui');
    expect(record.level).toBe('info');
    expect(record.message).toBe('cta-click');
    expect(record.data).toEqual({ target: 'download' });
  });

  it('logInteraction works without a data payload', () => {
    logInteraction('menu-open');
    const record = capture.records[0] as LogRecord;
    expect(record.message).toBe('menu-open');
    expect(record.data).toBeUndefined();
  });

  it('logPageView records the visited path', () => {
    logPageView('/features');
    const record = capture.records[0] as LogRecord;
    expect(record.message).toBe('page-view');
    expect(record.data).toEqual({ path: '/features' });
  });
});
