/**
 * Inline SVG icon set for feature cards.
 *
 * Icons are drawn as simple 24x24 stroke paths (Lucide-style) and keyed
 * by {@link FeatureIconName} so the content layer can reference them as
 * plain strings. Inlining keeps the site dependency-free and lets icons
 * inherit their color from CSS via `currentColor`.
 */
import type { FeatureIconName } from '../content/features';

/** SVG path data for each named icon. */
const ICON_PATHS: Record<FeatureIconName, React.JSX.Element> = {
  // Document with "y a m l"-ish lines: zero-code YAML authoring.
  yaml: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </>
  ),
  // Lightning bolt: native speed.
  bolt: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />,
  // Two stacked files: external payloads/schemas.
  file: (
    <>
      <path d="M15 2H9a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6z" />
      <path d="M5 8v12a2 2 0 0 0 2 2h8" />
    </>
  ),
  // Bug: debug logs.
  bug: (
    <>
      <circle cx="12" cy="13" r="5" />
      <path d="M12 8V5M8.5 9.5 6 7M15.5 9.5 18 7M7 13H4M20 13h-3M8.5 16.5 6 19M15.5 16.5 18 19" />
    </>
  ),
  // Terminal prompt: interactive TUI.
  terminal: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </>
  ),
  // Chained pipeline stages: CI/CD.
  pipeline: (
    <>
      <circle cx="5" cy="12" r="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="19" cy="12" r="2.5" />
      <path d="M7.5 12h2M14.5 12h2" />
    </>
  ),
  // Check inside circle: assertions.
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5L16 9" />
    </>
  ),
  // Hook shape: lifecycle callbacks.
  hook: <path d="M18 4v9a6 6 0 0 1-12 0v-1m0 0 3 3m-3-3-3 3" />,
  // Bar-chart page: HTML reports.
  report: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </>
  ),
  // Funnel: excluding tests.
  filter: <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />,
  // Price-tag: tags.
  tag: (
    <>
      <path d="m3 12 9-9h9v9l-9 9-9-9z" transform="rotate(90 12 12)" />
      <circle cx="15.5" cy="8.5" r="1.5" />
    </>
  ),
  // Crosshair: run a single test.
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  // Paper plane: plain request mode.
  send: <path d="m22 2-11 11M22 2 15 22l-4-9-9-4 20-7z" />,
  // Padlock: authentication.
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  // Script scroll: pre-request scripts.
  script: (
    <>
      <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V3z" />
      <path d="m10 8 2 2-2 2M14 13h3" />
    </>
  ),
  // Curly braces: template placeholders.
  braces: (
    <>
      <path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1" />
      <path d="M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1" />
    </>
  ),
  // Gear on a file: .env configuration.
  env: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 5.5V3M12 21v-2.5M18.5 12H21M3 12h2.5M16.6 7.4l1.8-1.8M5.6 18.4l1.8-1.8M16.6 16.6l1.8 1.8M5.6 5.6l1.8 1.8" />
    </>
  ),
};

/** Props of the {@link FeatureIcon} component. */
export interface FeatureIconProps {
  /** Which icon from the set to render. */
  readonly name: FeatureIconName;
  /** Pixel size of the square icon. Default 24. */
  readonly size?: number;
}

/**
 * Renders a named feature icon as an inline SVG.
 * `aria-hidden` because these icons are decorative — the adjacent
 * feature title carries the meaning.
 */
export function FeatureIcon({ name, size = 24 }: FeatureIconProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-icon={name}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
