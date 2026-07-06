/**
 * Shared test helpers.
 */
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { LogRecord, LogTransport } from '../logging';
import { addTransport, removeTransport } from '../logging';

/**
 * Renders a component inside a MemoryRouter, which components using
 * react-router hooks/links require. `initialPath` sets the starting URL.
 */
export function renderWithRouter(ui: ReactElement, initialPath = '/'): RenderResult {
  return render(<MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>);
}

/**
 * In-memory transport that captures every dispatched log record, so tests
 * can assert on logging behavior without touching the console or storage.
 */
export class CaptureTransport implements LogTransport {
  public readonly name = 'capture';
  /** Every record received, in dispatch order. */
  public readonly records: LogRecord[] = [];

  public write(record: LogRecord): void {
    this.records.push(record);
  }
}

/**
 * Registers a fresh CaptureTransport (and removes the default console
 * transport to keep test output clean). Returns the capture instance;
 * callers should invoke the returned `restore` when done.
 */
export function captureLogs(): { capture: CaptureTransport; restore: () => void } {
  const capture = new CaptureTransport();
  removeTransport('console');
  addTransport(capture);
  return {
    capture,
    restore: () => {
      removeTransport('capture');
    },
  };
}
