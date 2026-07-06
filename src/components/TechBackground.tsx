/**
 * Fixed decorative background layer.
 *
 * Renders very faint line drawings evoking the product's world —
 * a dotted grid, an application architecture diagram (client/API/services/
 * database boxes) and a CI/CD pipeline — behind all page content.
 * The layer is `pointer-events: none` and `aria-hidden` so it never
 * interferes with interaction or assistive technology.
 */

/** Dotted grid covering the whole viewport. */
function GridPattern(): React.JSX.Element {
  return (
    <svg className="tech-background__grid" aria-hidden="true">
      <defs>
        <pattern id="bg-dots" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-dots)" />
    </svg>
  );
}

/** Simplified application-architecture diagram (client → API → services → DB). */
function ArchitectureDiagram(): React.JSX.Element {
  return (
    <svg
      className="tech-background__arch"
      viewBox="0 0 520 360"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      {/* Client box */}
      <rect x="20" y="140" width="110" height="70" rx="10" />
      <text x="75" y="180" textAnchor="middle" fontSize="16" stroke="none" fill="currentColor">client</text>
      {/* API gateway box */}
      <rect x="200" y="140" width="120" height="70" rx="10" />
      <text x="260" y="180" textAnchor="middle" fontSize="16" stroke="none" fill="currentColor">REST API</text>
      {/* Service boxes */}
      <rect x="390" y="40" width="110" height="60" rx="10" />
      <rect x="390" y="150" width="110" height="60" rx="10" />
      <rect x="390" y="260" width="110" height="60" rx="10" />
      {/* Connections */}
      <path d="M130 175h70M320 175l70-95M320 175h70M320 175l70 115" />
    </svg>
  );
}

/** Simplified CI/CD pipeline: commit → build → test → deploy. */
function PipelineDiagram(): React.JSX.Element {
  return (
    <svg
      className="tech-background__pipeline"
      viewBox="0 0 560 140"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      {/* Four pipeline stages as circles with labels. */}
      <circle cx="60" cy="60" r="34" />
      <circle cx="210" cy="60" r="34" />
      <circle cx="360" cy="60" r="34" />
      <circle cx="510" cy="60" r="34" />
      <text x="60" y="66" textAnchor="middle" fontSize="14" stroke="none" fill="currentColor">commit</text>
      <text x="210" y="66" textAnchor="middle" fontSize="14" stroke="none" fill="currentColor">build</text>
      <text x="360" y="66" textAnchor="middle" fontSize="14" stroke="none" fill="currentColor">test</text>
      <text x="510" y="66" textAnchor="middle" fontSize="14" stroke="none" fill="currentColor">deploy</text>
      {/* Arrows between stages. */}
      <path d="M94 60h82m-8-6 8 6-8 6M244 60h82m-8-6 8 6-8 6M394 60h82m-8-6 8 6-8 6" />
    </svg>
  );
}

/** The complete decorative background layer. */
export function TechBackground(): React.JSX.Element {
  return (
    <div className="tech-background" aria-hidden="true" data-testid="tech-background">
      <GridPattern />
      <ArchitectureDiagram />
      <PipelineDiagram />
    </div>
  );
}
