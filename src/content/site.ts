/**
 * Central site metadata and external links.
 *
 * All URLs and product copy that appear in more than one place live here,
 * so updating the site (e.g. moving the repository) is a one-line change.
 */

/** External links related to the CmdRest project. */
export interface SiteLinks {
  /** GitHub releases page with downloadable native builds. */
  readonly releases: string;
  /** GitHub repository with the open-source code. */
  readonly sourceCode: string;
}

/** Top-level site metadata used across pages and the HTML head. */
export interface SiteMeta {
  /** Product name shown in the navbar, hero and footer. */
  readonly name: string;
  /** Short one-line pitch used under the product name. */
  readonly tagline: string;
  /** Longer description used in the hero section. */
  readonly description: string;
  readonly links: SiteLinks;
}

/** The single source of truth for site-wide metadata. */
export const site: SiteMeta = {
  name: 'CmdRest',
  tagline: 'Zero-code REST API testing from your terminal.',
  description:
    'CmdRest is an open-source command line tool for testing REST APIs. ' +
    'Describe your test suite in plain YAML, run it as a single native binary ' +
    'on macOS, Windows or Linux — no runtime to install, instant startup, ' +
    'and vibrant HTML reports when you are done.',
  links: {
    releases: 'https://github.com/snytkine/cmd-rest/releases',
    sourceCode: 'https://github.com/snytkine/cmd-rest',
  },
};

/** Names of the small glass icons shown next to the navbar links. */
export type IconName = 'home' | 'features' | 'download' | 'docs' | 'tutorials';

/** A navigation entry rendered in the top navbar. */
export interface NavItem {
  /** Visible label of the link. */
  readonly label: string;
  /** Router path the link navigates to. */
  readonly path: string;
  /** Icon rendered before the label. */
  readonly icon: IconName;
}

/** Ordered list of internal pages shown in the navigation bar. */
export const navItems: readonly NavItem[] = [
  { label: 'Home', path: '/', icon: 'home' },
  { label: 'Features', path: '/features', icon: 'features' },
  { label: 'Download', path: '/download', icon: 'download' },
  { label: 'Docs', path: '/docs', icon: 'docs' },
  { label: 'Tutorials', path: '/tutorials', icon: 'tutorials' },
];
