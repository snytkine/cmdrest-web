/**
 * Download page content: one card per supported operating system.
 *
 * All cards link to the same GitHub releases page (per-OS assets are
 * attached to each release there), so the URL lives in `site.links.releases`.
 */
import { site } from './site';

/** Identifier of a supported operating system. */
export type OsId = 'macos' | 'windows' | 'linux';

/** A downloadable platform build shown as a card on the Download page. */
export interface DownloadTarget {
  readonly id: OsId;
  /** Human-readable OS name. */
  readonly name: string;
  /** Short note about the build (architectures, install hint). */
  readonly note: string;
  /** URL of the releases page where the build can be downloaded. */
  readonly url: string;
}

/** The three supported platforms, in display order. */
export const downloadTargets: readonly DownloadTarget[] = [
  {
    id: 'macos',
    name: 'macOS',
    note: 'Native builds for Apple Silicon and Intel Macs. Download, unpack and run — no runtime needed.',
    url: site.links.releases,
  },
  {
    id: 'windows',
    name: 'Windows',
    note: 'A single native .exe for Windows. No Java, no installer dependencies, instant startup.',
    url: site.links.releases,
  },
  {
    id: 'linux',
    name: 'Linux',
    note: 'Static native binaries for popular Linux distributions, ideal for servers and CI runners.',
    url: site.links.releases,
  },
];
