/**
 * Renders one markdown documentation page inside the docs section.
 *
 * The slug comes either from the route parameter (`/docs/:slug`) or from
 * the `slug` prop (used by the `/docs` index route to show the first
 * page). The markdown is loaded and rendered by {@link renderDoc}, which
 * caches the HTML for the rest of the session.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getDocPage } from '../docs/config';
import { renderDoc } from '../docs/render';
import { DocToolbar } from '../components/DocToolbar';
import { NotFoundPage } from './NotFoundPage';
import { getLogger } from '../logging';

/** Props of the {@link DocArticlePage} component. */
export interface DocArticlePageProps {
  /** Page slug override; when omitted the `:slug` route param is used. */
  readonly slug?: string;
}

/** One markdown-backed documentation page. */
export function DocArticlePage({ slug }: DocArticlePageProps): React.JSX.Element {
  const params = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const page = getDocPage(slug ?? params.slug ?? '');
  const [html, setHtml] = useState<string | null>(null);
  // Target for the PDF export in the toolbar (the rendered article element).
  const articleRef = useRef<HTMLElement>(null);

  // Load (or fetch from the session cache) the rendered document.
  useEffect(() => {
    if (page === undefined) {
      return;
    }
    let active = true;
    setHtml(null);
    renderDoc(page.file)
      .then((rendered) => {
        if (active) {
          setHtml(rendered);
        }
      })
      .catch((error: unknown) => {
        getLogger('docs').error('doc-render-failed', { file: page.file, error: String(error) });
      });
    return () => {
      active = false;
    };
  }, [page]);

  // Once the content is on the page, honour a #fragment in the URL.
  useEffect(() => {
    if (html === null || location.hash === '') {
      return;
    }
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [html, location.hash]);

  if (page === undefined) {
    return <NotFoundPage />;
  }

  /**
   * Routes clicks on internal links (rewritten cross-document links like
   * `/docs/assertions`) through the SPA router instead of a full reload.
   */
  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    const anchor = (event.target as HTMLElement).closest('a');
    const href = anchor?.getAttribute('href');
    if (anchor !== null && href !== null && href !== undefined && href.startsWith('/')) {
      event.preventDefault();
      navigate(href);
    }
  };

  return (
    <>
      <DocToolbar slug={page.slug} file={page.file} title={page.title} articleRef={articleRef} />
      {html === null ? (
        <p className="docs-loading" role="status">
          Loading…
        </p>
      ) : (
        <article
          ref={articleRef}
          className="markdown"
          data-testid={`doc-${page.slug}`}
          onClick={handleClick}
          // The HTML is rendered from the site's own bundled markdown files,
          // not from user input, so injecting it directly is safe.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </>
  );
}
