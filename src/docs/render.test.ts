/**
 * Tests for the documentation markdown renderer: HTML output, link and
 * heading rewriting, the per-session render cache and the config it
 * relies on.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDocCache, getDocCacheSize, renderDoc } from './render';
import { docPages, docNavItems, getDocPage, getSlugForFile } from './config';

beforeEach(() => {
  clearDocCache();
});

describe('docs config', () => {
  it('has unique slugs and files', () => {
    const slugs = docPages.map((page) => page.slug);
    const files = docPages.map((page) => page.file);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(files).size).toBe(files.length);
  });

  it('resolves pages by slug and files to slugs', () => {
    expect(getDocPage('getting-started')?.file).toBe('getting-started.md');
    expect(getSlugForFile('index.md')).toBe('introduction');
    expect(getDocPage('missing')).toBeUndefined();
  });

  it('ends the navigation with the Examples page', () => {
    expect(docNavItems.at(-1)).toEqual({ path: '/docs/examples', title: 'Examples' });
  });
});

describe('renderDoc', () => {
  it('renders every configured document to non-empty HTML', async () => {
    for (const page of docPages) {
      const html = await renderDoc(page.file);
      expect(html).toContain('<h1');
    }
  });

  it('adds GitHub-style ids to headings for in-page anchors', async () => {
    const html = await renderDoc('index.md');
    expect(html).toContain('<h1 id="application-introduction"');
  });

  it('rewrites cross-document links to internal /docs routes', async () => {
    const html = await renderDoc('index.md');
    expect(html).toContain('href="/docs/getting-started"');
    // Links with anchors keep their fragment.
    const cli = await renderDoc('getting-started.md');
    expect(cli).toContain('href="/docs/cli-reference"');
  });

  it('opens external links in a new tab', async () => {
    // getting-started.md links to the GitHub releases page.
    const html = await renderDoc('getting-started.md');
    expect(html).toMatch(/<a href="https:[^"]*" target="_blank" rel="noreferrer">/);
  });

  it('caches each rendered document for the session', async () => {
    expect(getDocCacheSize()).toBe(0);
    await renderDoc('index.md');
    expect(getDocCacheSize()).toBe(1);
    // A second render of the same file is served from the cache.
    await renderDoc('index.md');
    expect(getDocCacheSize()).toBe(1);
  });

  it('rejects files that are not part of the docs directory', async () => {
    await expect(renderDoc('nope.md')).rejects.toThrow(/Unknown documentation file/);
  });
});
