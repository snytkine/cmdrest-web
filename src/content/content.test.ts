/**
 * Tests for the content layer (`site.ts`, `features.ts`, `downloads.ts`).
 *
 * These tests act as a safety net for content edits: because the site's
 * copy is maintained as plain data, a typo like a duplicate feature id or
 * a malformed URL would otherwise only surface visually.
 */
import { describe, expect, it } from 'vitest';
import { site, navItems } from './site';
import { features, getHighlightedFeatures, groupFeaturesByCategory } from './features';
import { downloadTargets } from './downloads';

describe('site metadata', () => {
  it('exposes the product name and tagline', () => {
    expect(site.name).toBe('CmdRest');
    expect(site.tagline.length).toBeGreaterThan(0);
  });

  it('has valid https URLs for all external links', () => {
    // `new URL` throws on malformed URLs, so this both validates the
    // format and asserts the protocol.
    for (const url of Object.values(site.links)) {
      expect(new URL(url).protocol).toBe('https:');
    }
  });

  it('points at the expected GitHub project', () => {
    expect(site.links.sourceCode).toBe('https://github.com/snytkine/api-tester-cli');
    expect(site.links.releases).toBe('https://github.com/snytkine/api-tester-cli/releases');
  });

  it('declares navigation items whose paths are absolute', () => {
    expect(navItems.length).toBeGreaterThanOrEqual(4);
    for (const item of navItems) {
      expect(item.path.startsWith('/')).toBe(true);
      expect(item.label.length).toBeGreaterThan(0);
    }
  });
});

describe('features catalogue', () => {
  it('contains all 17 advertised features', () => {
    expect(features).toHaveLength(17);
  });

  it('has unique, non-empty ids', () => {
    const ids = features.map((feature) => feature.id);
    // A Set collapses duplicates, so equal sizes prove uniqueness.
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it('has a title and description for every feature', () => {
    for (const feature of features) {
      expect(feature.title.length).toBeGreaterThan(0);
      expect(feature.description.length).toBeGreaterThan(20);
    }
  });

  it('getHighlightedFeatures returns only highlighted features', () => {
    const highlighted = getHighlightedFeatures();
    expect(highlighted.length).toBeGreaterThanOrEqual(4);
    // Every returned feature must carry the highlight flag...
    for (const feature of highlighted) {
      expect(feature.highlight).toBe(true);
    }
    // ...and no highlighted feature may be missing from the result.
    const expected = features.filter((feature) => feature.highlight === true);
    expect(highlighted).toEqual(expected);
  });

  it('groupFeaturesByCategory buckets every feature exactly once', () => {
    const grouped = groupFeaturesByCategory();
    // Flattening the buckets must reproduce the full catalogue.
    const total = [...grouped.values()].reduce((sum, bucket) => sum + bucket.length, 0);
    expect(total).toBe(features.length);
    // Every bucket only contains features of its own category.
    for (const [category, bucket] of grouped) {
      for (const feature of bucket) {
        expect(feature.category).toBe(category);
      }
    }
  });

  it('groupFeaturesByCategory preserves declaration order within a bucket', () => {
    const grouped = groupFeaturesByCategory();
    for (const bucket of grouped.values()) {
      // The bucket order must match the order in the source array.
      const sourceOrder = features.filter((feature) => bucket.includes(feature));
      expect(bucket).toEqual(sourceOrder);
    }
  });
});

describe('download targets', () => {
  it('offers builds for macOS, Windows and Linux', () => {
    expect(downloadTargets.map((target) => target.id)).toEqual(['macos', 'windows', 'linux']);
  });

  it('links every platform to the GitHub releases page', () => {
    for (const target of downloadTargets) {
      expect(target.url).toBe(site.links.releases);
    }
  });
});
