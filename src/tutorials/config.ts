/**
 * Configuration of the tutorials section (`/tutorials`).
 *
 * Each entry maps a navigation page (URL slug + sidebar title) to the
 * React component that renders its body content. Unlike the docs section
 * (markdown files), tutorials are mostly non-prose (embedded videos,
 * screenshots, step lists), so their content lives in small components
 * under `src/tutorials/pages/` instead. Adding a new tutorial is a
 * two-step change: add the page component and one entry to {@link tutorialPages}.
 */
import type { ComponentType } from 'react';
import { DownloadAndInstallTutorial } from './pages/DownloadAndInstallTutorial';

/** One tutorial page. */
export interface TutorialPageConfig {
  /** URL segment of the page: `/tutorials/<slug>`. */
  readonly slug: string;
  /** Title shown in the sidebar navigation, the browser and the page heading. */
  readonly title: string;
  /** One-line summary shown under the title on the page. */
  readonly description: string;
  /** Component rendering the tutorial's body content. */
  readonly Content: ComponentType;
}

/** The page shown at `/tutorials` itself (also first in the sidebar). */
export const firstTutorialPage: TutorialPageConfig = {
  slug: 'download-and-install',
  title: 'Download and Install',
  description:
    'Step by step tutorials on downloading and installing native Mac OS version of CmdRest application.',
  Content: DownloadAndInstallTutorial,
};

/** Ordered list of tutorial pages. */
export const tutorialPages: readonly TutorialPageConfig[] = [firstTutorialPage];

/** Looks up a tutorial page by its URL slug. */
export function getTutorialPage(slug: string): TutorialPageConfig | undefined {
  return tutorialPages.find((page) => page.slug === slug);
}
