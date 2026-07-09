/**
 * Export toolbar shown at the top of every markdown-backed documentation
 * page. Offers two actions:
 *
 * - **Markdown** — opens the page's original raw `.md` source in a new
 *   browser tab (built from a Blob of the already-bundled source), so a
 *   reader can view or save the plain markdown.
 * - **PDF** — generates a downloadable PDF of the rendered article
 *   client-side. `html2pdf.js` is loaded lazily (only when the button is
 *   clicked) so it never weighs down the main bundle.
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

/** Export links (Markdown source + PDF) for a documentation page. */
export function DocToolbar({ slug, file, title, articleRef }: DocToolbarProps): React.JSX.Element {
  // `title` is part of the public props for future use (e.g. PDF headers);
  // reference it so strict unused-parameter checks stay happy.
  void title;
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

  /** Generates and downloads a PDF of the rendered article. */
  const handlePdf = async (): Promise<void> => {
    const article = articleRef.current;
    if (article === null || generating) {
      return;
    }
    logInteraction('doc-export-click', { format: 'pdf', slug });
    setGenerating(true);
    try {
      // Lazy-loaded so html2pdf (+ jsPDF, html2canvas) stays out of the
      // main bundle and only downloads when a reader exports a PDF.
      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf()
        .set({
          filename: `${slug}.pdf`,
          margin: [12, 12, 16, 12],
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(article)
        .save();
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
