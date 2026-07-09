/**
 * Tests for the documentation export toolbar: the Markdown link opens the
 * raw source in a new tab, and the PDF button lazily loads html2pdf and
 * downloads a PDF named after the page slug.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DocToolbar } from './DocToolbar';
import { captureLogs } from '../test/helpers';

// A controllable pdfmake stack so tests can assert on the conversion +
// document definition and, where needed, hold the getBlob callback open to
// observe the button's in-flight (disabled) state.
const { pdfMakeMock, htmlToPdfmakeMock, createdPdf, addVfs } = vi.hoisted(() => {
  const createdPdf = {
    // getBlob resolves with the PDF blob; individual tests override this to
    // control timing.
    getBlob: vi.fn(() => Promise.resolve(new Blob(['%PDF'], { type: 'application/pdf' }))),
  };
  const addVfs = vi.fn();
  const pdfMakeMock = {
    addVirtualFileSystem: addVfs,
    createPdf: vi.fn(() => createdPdf),
  };
  const htmlToPdfmakeMock = vi.fn((_html: string, _options?: unknown) => ({
    content: [{ text: 'doc' }],
    images: {},
  }));
  return { pdfMakeMock, htmlToPdfmakeMock, createdPdf, addVfs };
});

vi.mock('pdfmake/build/pdfmake', () => ({ default: pdfMakeMock }));
vi.mock('pdfmake/build/vfs_fonts', () => ({ default: {} }));
vi.mock('html-to-pdfmake', () => ({ default: htmlToPdfmakeMock }));

/** Builds a ref to a detached article element for the PDF capture target. */
function articleRef(): React.RefObject<HTMLElement | null> {
  return { current: document.createElement('article') };
}

beforeEach(() => {
  pdfMakeMock.createPdf.mockClear();
  htmlToPdfmakeMock.mockClear();
  createdPdf.getBlob.mockClear();
  addVfs.mockClear();
  createdPdf.getBlob.mockImplementation(() =>
    Promise.resolve(new Blob(['%PDF'], { type: 'application/pdf' })),
  );
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

  it('lazily generates a selectable-text PDF and downloads it named after the slug', async () => {
    const { capture, restore } = captureLogs();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<DocToolbar slug="assertions" file="assertions.md" title="Assertions" articleRef={articleRef()} />);

    screen.getByRole('button', { name: /^pdf$/i }).click();

    await waitFor(() => {
      expect(createdPdf.getBlob).toHaveBeenCalledTimes(1);
    });
    // The rendered HTML is converted to pdfmake content (real text, not an image).
    expect(htmlToPdfmakeMock).toHaveBeenCalledTimes(1);
    expect(pdfMakeMock.createPdf).toHaveBeenCalledWith(
      expect.objectContaining({ info: { title: 'Assertions' } }),
    );
    // The blob is downloaded via an anchor with the slug-based filename.
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('assertions.pdf');
    expect(anchor.href).toBe('blob:mock-url');
    expect(capture.records).toContainEqual(
      expect.objectContaining({ message: 'doc-export-click', data: { format: 'pdf', slug: 'assertions' } }),
    );
    clickSpy.mockRestore();
    restore();
  });

  it('strips element ids so pages with repeated heading anchors export', async () => {
    // pdfmake requires unique node ids; the CLI reference has several
    // "Syntax" headings that all render as id="syntax". Duplicate ids must
    // be removed before conversion or pdfmake throws.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const ref = articleRef();
    ref.current!.innerHTML =
      '<h2 id="syntax">Syntax</h2><p>a</p><h3 id="syntax">Syntax</h3><p>b</p>';
    render(<DocToolbar slug="cli-reference" file="cli-reference.md" title="CLI Reference" articleRef={ref} />);

    screen.getByRole('button', { name: /^pdf$/i }).click();

    await waitFor(() => {
      expect(htmlToPdfmakeMock).toHaveBeenCalledTimes(1);
    });
    const htmlArg = htmlToPdfmakeMock.mock.calls[0]?.[0] as string;
    expect(htmlArg).not.toContain('id=');
    expect(htmlArg).toContain('Syntax');
  });

  it('disables the PDF button while a PDF is being generated', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    // Hold the getBlob promise open so the in-flight state is observable.
    let finishBlob = (): void => {};
    createdPdf.getBlob.mockImplementation(
      () =>
        new Promise<Blob>((resolve) => {
          finishBlob = () => {
            resolve(new Blob(['%PDF'], { type: 'application/pdf' }));
          };
        }),
    );

    render(<DocToolbar slug="templating" file="templating.md" title="Templating" articleRef={articleRef()} />);
    screen.getByRole('button', { name: /^pdf$/i }).click();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
    });

    finishBlob();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^pdf$/i })).not.toBeDisabled();
    });
  });
});
