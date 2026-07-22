/**
 * Configuration of the documentation section (`/docs`).
 *
 * Each entry maps a navigation page (URL slug + sidebar title) to the
 * markdown document in this directory that the page renders. Adding a
 * new doc is a two-step change: drop the `.md` file here and add one
 * entry to {@link docPages}.
 */

/** One documentation page backed by a markdown file. */
export interface DocPageConfig {
  /** URL segment of the page: `/docs/<slug>`. */
  readonly slug: string;
  /** Title shown in the sidebar navigation and the browser. */
  readonly title: string;
  /** Markdown file (relative to `src/docs/`) rendered on the page. */
  readonly file: string;
}

/** The page shown at `/docs` itself (also first in the sidebar). */
export const firstDocPage: DocPageConfig = {
  slug: 'introduction',
  title: 'Introduction',
  file: 'index.md',
};

/** Ordered list of markdown-backed documentation pages. */
export const docPages: readonly DocPageConfig[] = [
  firstDocPage,
  { slug: 'getting-started', title: 'Getting Started', file: 'getting-started.md' },
  { slug: 'test-suite-configuration', title: 'Test Suite Configuration', file: 'test-suite-configuration.md' },
  { slug: 'test-chaining', title: 'Test Chaining', file: 'test-chaining.md' },
  { slug: 'lifecycle-hooks', title: 'Lifecycle Hooks', file: 'hooks.md' },
  { slug: 'assertions', title: 'Assertions', file: 'assertions.md' },
  { slug: 'templating', title: 'Templating', file: 'templating.md' },
  { slug: 'cli-reference', title: 'CLI Reference', file: 'cli-reference.md' },
  { slug: 'environment-variables', title: 'Environment Variables', file: 'environment-variables.md' },
  { slug: 'html-report', title: 'HTML Report', file: 'html-report.md' },
  { slug: 'schema-support', title: 'Schema Support', file: 'schema-support.md' },
  { slug: 'version-check', title: 'Version Check', file: 'version-check.md' },
];

/** Slug of the special Examples page (rendered by a React component). */
export const EXAMPLES_SLUG = 'examples';

/** A sidebar navigation entry (markdown page or the Examples page). */
export interface DocNavItem {
  /** Router path of the entry. */
  readonly path: string;
  /** Visible label in the sidebar. */
  readonly title: string;
}

/**
 * Sidebar navigation: every configured markdown page, in order, followed
 * by the Examples page. The first page is served at `/docs` itself.
 */
export const docNavItems: readonly DocNavItem[] = [
  ...docPages.map((page, index) => ({
    path: index === 0 ? '/docs' : `/docs/${page.slug}`,
    title: page.title,
  })),
  { path: `/docs/${EXAMPLES_SLUG}`, title: 'Examples' },
];

/** Looks up a documentation page by its URL slug. */
export function getDocPage(slug: string): DocPageConfig | undefined {
  return docPages.find((page) => page.slug === slug);
}

/** Looks up the slug of the page that renders the given markdown file. */
export function getSlugForFile(file: string): string | undefined {
  return docPages.find((page) => page.file === file)?.slug;
}
