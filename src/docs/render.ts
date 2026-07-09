/**
 * Markdown loading and rendering for the documentation section.
 *
 * Each `.md` file in this directory is bundled as a lazily-loaded raw
 * string (its own chunk, fetched on first visit) and rendered to HTML
 * with `marked`. The rendered HTML is cached in a module-level Map, so
 * a document is rendered at most once per browser session: the cache
 * lives only as long as the loaded bundle, which means a new website
 * release automatically starts with an empty cache.
 */
import { Marked } from 'marked';
import type { Tokens } from 'marked';
import { getSlugForFile } from './config';

/** Lazy raw-text loaders for every markdown document, keyed by `./name.md`. */
const docSources = import.meta.glob('./*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

/** Bundled URLs of images referenced from the docs, keyed by `./name.ext`. */
const docImages = import.meta.glob('./*.{png,jpg,jpeg,gif,svg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Matches relative cross-document links like `assertions.md#path-syntax`. */
const DOC_LINK = /^([\w][\w.-]*\.md)(#.*)?$/;

/** Escapes a string for use inside an HTML attribute value. */
function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Derives a GitHub-style anchor id from a heading's raw markdown text,
 * so in-page links like `[run-suite](#run-suite)` keep working.
 */
function headingId(rawText: string): string {
  return rawText
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Rewrites a markdown href for the website:
 * - `other-doc.md(#anchor)` becomes the internal route `/docs/<slug>(#anchor)`,
 * - everything else (external URLs, in-page `#anchors`) is kept as-is.
 */
function resolveHref(href: string): string {
  const match = DOC_LINK.exec(href);
  if (match === null) {
    return href;
  }
  const file = match[1] ?? '';
  const anchor = match[2] ?? '';
  const slug = getSlugForFile(file);
  // A link to a document that has no configured page is left untouched.
  return slug === undefined ? href : `/docs/${slug}${anchor}`;
}

/** Marked instance with website-specific link, image and heading rendering. */
const markdown = new Marked({
  renderer: {
    heading({ tokens, depth, text }: Tokens.Heading): string {
      const inner = this.parser.parseInline(tokens);
      return `<h${depth} id="${headingId(text)}">${inner}</h${depth}>\n`;
    },
    link({ href, title, tokens }: Tokens.Link): string {
      const inner = this.parser.parseInline(tokens);
      const resolved = resolveHref(href);
      const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : '';
      // External links open in a new tab, like everywhere else on the site.
      const external = /^https?:\/\//.test(resolved)
        ? ' target="_blank" rel="noreferrer"'
        : '';
      return `<a href="${escapeAttribute(resolved)}"${titleAttribute}${external}>${inner}</a>`;
    },
    image({ href, title, text }: Tokens.Image): string {
      // Map relative image references onto their bundled asset URLs.
      const key = href.startsWith('./') ? href : `./${href}`;
      const source = docImages[key] ?? href;
      const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : '';
      return `<img src="${escapeAttribute(source)}" alt="${escapeAttribute(text)}"${titleAttribute} loading="lazy" />`;
    },
  },
});

/**
 * Per-session render cache: markdown file name → rendered HTML.
 * Deliberately module-level (not sessionStorage): it disappears with the
 * page, so a newly released bundle can never serve stale HTML.
 */
const renderedDocs = new Map<string, string>();

/**
 * Loads and renders a markdown document from `src/docs/`, returning its
 * HTML. Results are cached for the lifetime of the session.
 *
 * @param file File name relative to `src/docs/`, e.g. `"assertions.md"`.
 * @throws If the file is not part of the docs directory.
 */
export async function renderDoc(file: string): Promise<string> {
  const cached = renderedDocs.get(file);
  if (cached !== undefined) {
    return cached;
  }
  const load = docSources[`./${file}`];
  if (load === undefined) {
    throw new Error(`Unknown documentation file: ${file}`);
  }
  const raw = await load();
  const html = markdown.parse(raw, { async: false });
  renderedDocs.set(file, html);
  return html;
}

/**
 * Loads the raw, unrendered markdown text of a documentation file. Used by
 * the docs toolbar to offer the original `.md` source for download/viewing.
 *
 * @param file File name relative to `src/docs/`, e.g. `"assertions.md"`.
 * @throws If the file is not part of the docs directory.
 */
export async function getDocSource(file: string): Promise<string> {
  const load = docSources[`./${file}`];
  if (load === undefined) {
    throw new Error(`Unknown documentation file: ${file}`);
  }
  return load();
}

/** Empties the render cache. Intended for tests. */
export function clearDocCache(): void {
  renderedDocs.clear();
}

/** Number of documents currently cached. Intended for tests. */
export function getDocCacheSize(): number {
  return renderedDocs.size;
}
