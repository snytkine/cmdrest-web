/**
 * The full CmdRest feature catalogue.
 *
 * Each feature is plain data (no JSX) so non-developers can edit copy here
 * without touching any component. Icons are keys into the icon map in
 * `FeatureIcon.tsx`; categories drive the grouped layout on the Features page.
 */

/** Category buckets used to group features on the Features page. */
export type FeatureCategory =
  | 'Authoring'
  | 'Performance'
  | 'Execution'
  | 'Reporting'
  | 'Flexibility';

/** Names of the inline SVG icons available to feature cards. */
export type FeatureIconName =
  | 'yaml'
  | 'bolt'
  | 'file'
  | 'bug'
  | 'terminal'
  | 'pipeline'
  | 'check'
  | 'hook'
  | 'report'
  | 'filter'
  | 'tag'
  | 'target'
  | 'send'
  | 'lock'
  | 'script'
  | 'braces'
  | 'env';

/** A single product feature rendered as a card. */
export interface Feature {
  /** Stable identifier, used as the React list key. */
  readonly id: string;
  /** Short bold title of the feature. */
  readonly title: string;
  /** One or two sentence description of the feature. */
  readonly description: string;
  /** Icon rendered next to the title. */
  readonly icon: FeatureIconName;
  /** Category bucket for grouping on the Features page. */
  readonly category: FeatureCategory;
  /** Marks the handful of features highlighted on the home page. */
  readonly highlight?: boolean;
}

/** Ordered list of every CmdRest feature promoted on the website. */
export const features: readonly Feature[] = [
  {
    id: 'zero-code',
    title: 'Zero-Code Test Creation',
    description:
      'Build complete API test suites using only .yaml files. No programming required — describe requests and expectations declaratively.',
    icon: 'yaml',
    category: 'Authoring',
    highlight: true,
  },
  {
    id: 'native-binaries',
    title: 'Native Binaries, Instant Startup',
    description:
      'Compiled to native applications for macOS, Windows and Linux. No Java or other runtime to install — extremely fast startup and test execution.',
    icon: 'bolt',
    category: 'Performance',
    highlight: true,
  },
  {
    id: 'external-payloads',
    title: 'Inline or External Payloads',
    description:
      'Payload bodies and JSON schemas can be stored as external files or written inline, keeping large suites organized.',
    icon: 'file',
    category: 'Authoring',
  },
  {
    id: 'debug-logs',
    title: 'Debug Logging',
    description:
      'Turn on detailed debug logs during test execution to see exactly what was sent, received and asserted.',
    icon: 'bug',
    category: 'Execution',
  },
  {
    id: 'interactive-tui',
    title: 'Interactive Terminal UI',
    description:
      'A rich terminal experience with colors, animations and interactive menus for browsing and running your tests.',
    icon: 'terminal',
    category: 'Execution',
    highlight: true,
  },
  {
    id: 'ci-mode',
    title: 'CI/CD-Ready Non-Interactive Mode',
    description:
      'A non-interactive mode with machine-friendly output and exit codes, purpose-built for pipelines like GitHub Actions, Jenkins or GitLab CI.',
    icon: 'pipeline',
    category: 'Execution',
    highlight: true,
  },
  {
    id: 'assertions',
    title: '50+ Assertion Types',
    description:
      'Assert on status codes, headers, bodies, JSON paths, schemas, timings and much more — over fifty assertion types built in.',
    icon: 'check',
    category: 'Authoring',
    highlight: true,
  },
  {
    id: 'lifecycle-hooks',
    title: 'Lifecycle Callback Hooks',
    description:
      'Run custom callbacks at key points of the test lifecycle to prepare data, clean up state or integrate with other tools.',
    icon: 'hook',
    category: 'Flexibility',
  },
  {
    id: 'html-reports',
    title: 'Vibrant HTML Reports',
    description:
      'Generate beautiful, self-contained HTML test reports you can archive, share with your team or publish from CI.',
    icon: 'report',
    category: 'Reporting',
    highlight: true,
  },
  {
    id: 'exclude-tests',
    title: 'Exclude Tests',
    description:
      'Temporarily exclude selected tests from a run without deleting them from the suite.',
    icon: 'filter',
    category: 'Execution',
  },
  {
    id: 'tags',
    title: 'Run by Tag',
    description:
      'Tag your tests and run only the ones matching a given tag — smoke, regression, nightly, you name it.',
    icon: 'tag',
    category: 'Execution',
  },
  {
    id: 'single-test',
    title: 'Run a Single Test',
    description:
      'Execute one specific test from a large suite while debugging, without running everything else.',
    icon: 'target',
    category: 'Execution',
  },
  {
    id: 'request-mode',
    title: 'Plain Request Mode',
    description:
      'Just make HTTP requests and inspect responses without running any assertions — a quick API client in your terminal.',
    icon: 'send',
    category: 'Flexibility',
  },
  {
    id: 'auth',
    title: 'Authentication Support',
    description:
      'First-class support for various authentication types so secured APIs are as easy to test as open ones.',
    icon: 'lock',
    category: 'Flexibility',
  },
  {
    id: 'pre-request',
    title: 'Pre-Request Scripts',
    description:
      'Run scripts before a request fires to compute values, sign payloads or set up preconditions.',
    icon: 'script',
    category: 'Flexibility',
  },
  {
    id: 'templates',
    title: 'Template Placeholders',
    description:
      'Use template-style placeholders throughout your suite to make tests flexible and reusable across environments.',
    icon: 'braces',
    category: 'Authoring',
  },
  {
    id: 'env-files',
    title: '.env File Support',
    description:
      'Keep parameters and secrets out of your suite with external .env files loaded at runtime.',
    icon: 'env',
    category: 'Authoring',
  },
];

/**
 * Convenience selector for the features highlighted on the home page.
 * Kept as a function (not a precomputed constant) so tests can verify
 * the filtering logic independently of the data.
 */
export function getHighlightedFeatures(): readonly Feature[] {
  return features.filter((feature) => feature.highlight === true);
}

/**
 * Groups all features by their category, preserving the declaration order
 * of both categories and features. Used by the Features page to render
 * one section per category.
 */
export function groupFeaturesByCategory(): ReadonlyMap<FeatureCategory, Feature[]> {
  const grouped = new Map<FeatureCategory, Feature[]>();
  for (const feature of features) {
    // Create the bucket on first sight of the category, then append.
    const bucket = grouped.get(feature.category);
    if (bucket) {
      bucket.push(feature);
    } else {
      grouped.set(feature.category, [feature]);
    }
  }
  return grouped;
}
