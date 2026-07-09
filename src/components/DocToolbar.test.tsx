/**
 * Tests for the documentation export toolbar: the Markdown link opens the
 * raw source in a new tab, and the PDF button lazily loads html2pdf and
 * downloads a PDF named after the page slug.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DocToolbar } from './DocToolbar';
import { captureLogs } from '../test/helpers';

// A controllable html2pdf worker so tests can assert on the chained calls
// and, where needed, hold the `save()` promise open to observe the button's
// in-flight (disabled) state.
const { html2pdfMock, worker } = vi.hoisted(() => {
  const worker = {
    set: vi.fn(() => worker),
    from: vi.fn(() => worker),
    save: vi.fn(() => Promise.resolve()),
  };
  return { html2pdfMock: vi.fn(() => worker), worker };
});

vi.mock('html2pdf.js', () => ({ default: html2pdfMock }));

/** Builds a ref to a detached article element for the PDF capture target. */
function articleRef(): React.RefObject<HTMLElement | null> {
  return { current: document.createElement('article') };
}

beforeEach(() => {
  html2pdfMock.mockClear();
  worker.set.mockClear();
  worker.from.mockClear();
  worker.save.mockClear();
  worker.save.mockImplementation(() => Promise.resolve());
  // jsdom does not implement these; stub them so the component can run.
  window.open = vi.fn();
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DocToolbar', () => {
  it('renders a Markdown and a PDF action', () => {
    render(<DocToolbar slug="assertions" file="assertions.md" title="Assertions" articleRef={articleRef()} />);
    expect(screen.getByRole('button', { name: /markdown/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pdf$/i })).toBeInTheDocument();
  });

  it('opens the raw markdown source in a new tab when Markdown is clicked', async () => {
    const { capture, restore } = captureLogs();
    render(<DocToolbar slug="introduction" file="index.md" title="Introduction" articleRef={articleRef()} />);

    screen.getByRole('button', { name: /markdown/i }).click();

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });
    expect(window.open).toHaveBeenCalledWith('blob:mock-url', '_blank', 'noopener');
    // The Blob is built from the real bundled markdown source.
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('text/plain');
    expect(capture.records).toContainEqual(
      expect.objectContaining({ message: 'doc-export-click', data: { format: 'markdown', slug: 'introduction' } }),
    );
    restore();
  });

  it('lazily generates a PDF named after the slug when PDF is clicked', async () => {
    const { capture, restore } = captureLogs();
    render(<DocToolbar slug="assertions" file="assertions.md" title="Assertions" articleRef={articleRef()} />);

    screen.getByRole('button', { name: /^pdf$/i }).click();

    await waitFor(() => {
      expect(worker.save).toHaveBeenCalledTimes(1);
    });
    expect(html2pdfMock).toHaveBeenCalledTimes(1);
    expect(worker.set).toHaveBeenCalledWith(expect.objectContaining({ filename: 'assertions.pdf' }));
    expect(capture.records).toContainEqual(
      expect.objectContaining({ message: 'doc-export-click', data: { format: 'pdf', slug: 'assertions' } }),
    );
    restore();
  });

  it('disables the PDF button while a PDF is being generated', async () => {
    // Hold the save() promise open so the in-flight state is observable.
    let resolveSave = (): void => {};
    worker.save.mockImplementation(() => new Promise<void>((resolve) => {
      resolveSave = resolve;
    }));

    render(<DocToolbar slug="templating" file="templating.md" title="Templating" articleRef={articleRef()} />);
    const button = screen.getByRole('button', { name: /^pdf$/i });
    button.click();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
    });

    resolveSave();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^pdf$/i })).not.toBeDisabled();
    });
  });
});
