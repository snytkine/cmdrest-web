/**
 * Export toolbar shown at the top of every markdown-backed documentation
 * page. Offers two actions:
 *
 * - **Markdown** — opens the page's original raw `.md` source in a new
 *   browser tab (built from a Blob of the already-bundled source), so a
 *   reader can view or save the plain markdown.
 * - **PDF** — generates a downloadable, selectable-text PDF of the rendered
 *   article client-side with pdfmake + html-to-pdfmake, both loaded lazily
 *   (only when the button is clicked) so they never weigh down the main
 *   bundle.
 */
import { useState } from 'react';
import { getDocSource } from '../docs/render';
import { getLogger, logInteraction } from '../logging';

/** Props of the {@link DocToolbar} component. */
export interface DocToolbarProps {
  /** Slug of the page, used for the PDF filename and interaction logs. */
  readonly slug: string;
  /** Markdown file name (relative to `src/docs/`) to expose as source. */
  readonly file: string;
  /** Human-readable page title (reserved for future labelling). */
  readonly title: string;
  /** Ref to the rendered `.markdown` article that PDF export captures. */
  readonly articleRef: React.RefObject<HTMLElement | null>;
}

/** A small stroke icon matching the site's Lucide-style icon set. */
function ToolbarIcon({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Triggers a browser download of a Blob under the given file name. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10_000);
}

/** Export links (Markdown source + PDF) for a documentation page. */
export function DocToolbar({ slug, file, title, articleRef }: DocToolbarProps): React.JSX.Element {
  const [generating, setGenerating] = useState(false);

  /** Opens the raw markdown source in a new browser tab. */
  const handleMarkdown = async (): Promise<void> => {
    logInteraction('doc-export-click', { format: 'markdown', slug });
    try {
      const raw = await getDocSource(file);
      const blob = new Blob([raw], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      // Give the new tab time to load before releasing the object URL.
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60_000);
    } catch (error: unknown) {
      getLogger('docs').error('doc-markdown-open-failed', { file, error: String(error) });
    }
  };

  /** Generates and downloads a selectable-text PDF of the rendered article. */
  const handlePdf = async (): Promise<void> => {
    const article = articleRef.current;
    if (article === null || generating) {
      return;
    }
    logInteraction('doc-export-click', { format: 'pdf', slug });
    setGenerating(true);
    try {
      // Lazy-loaded so pdfmake (+ fonts) and html-to-pdfmake stay out of
      // the main bundle and only download when a reader exports a PDF.
      const [{ default: pdfMake }, { default: vfs }, { default: htmlToPdfmake }] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts'),
        import('html-to-pdfmake'),
      ]);
      pdfMake.addVirtualFileSystem(vfs);

      // Strip element ids before conversion. Our heading anchors can repeat
      // across a page (e.g. several "Syntax" sections in the CLI reference),
      // and html-to-pdfmake carries ids onto pdfmake nodes, which must be
      // unique — duplicates throw "Node id '...' already exists". We don't
      // need in-PDF anchors, so removing the ids is the simplest fix.
      const clone = article.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[id]').forEach((element) => {
        element.removeAttribute('id');
      });

      // Convert the already-rendered article HTML into pdfmake content.
      // `imagesByReference` collects <img> sources into a map that pdfmake
      // resolves, so the docs' screenshots survive into the PDF.
      const parsed = htmlToPdfmake(clone.innerHTML, {
        window,
        imagesByReference: true,
      }) as { content: unknown[]; images?: Record<string, string> };

      const blob = await pdfMake
        .createPdf({
          content: parsed.content,
          images: parsed.images ?? {},
          pageMargins: [40, 40, 40, 48],
          defaultStyle: { fontSize: 11, lineHeight: 1.3 },
          info: { title },
        })
        .getBlob();
      downloadBlob(blob, `${slug}.pdf`);
    } catch (error: unknown) {
      getLogger('docs').error('doc-pdf-export-failed', { slug, error: String(error) });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="doc-toolbar">
      <button
        type="button"
        className="doc-toolbar__link"
        onClick={() => {
          void handleMarkdown();
        }}
      >
        <ToolbarIcon>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 13v5l2-2 2 2v-5" />
        </ToolbarIcon>
        Markdown
      </button>
      <button
        type="button"
        className="doc-toolbar__link"
        onClick={() => {
          void handlePdf();
        }}
        disabled={generating}
        aria-busy={generating}
      >
        <ToolbarIcon>
          <path d="M12 3v10m0 0-3.5-3.5M12 13l3.5-3.5" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </ToolbarIcon>
        {generating ? 'Generating…' : 'PDF'}
      </button>
    </div>
  );
}
