/**
 * Small glossy "glass" tile with a white line glyph, shown next to each
 * navbar link. The tile tilts in 3D and a sheen sweeps across it when
 * its parent link is hovered or focused (see `.glass-icon` in
 * global.css). Purely decorative, so it is hidden from assistive
 * technology.
 */
import type { ReactNode } from 'react';
import type { IconName } from '../content/site';

/** Line-art glyph for every icon, drawn on a 24x24 grid. */
const GLYPHS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M4 11.2 12 4.5l8 6.7" />
      <path d="M6.5 9.8V19h4v-4.5h3V19h4V9.8" />
    </>
  ),
  features: (
    <>
      <path d="M10 4.5l1.7 4.3 4.3 1.7-4.3 1.7L10 16.5l-1.7-4.3L4 10.5l4.3-1.7Z" />
      <path d="M17.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" />
    </>
  ),
  download: (
    <>
      <path d="M12 4.5V14M8 10.5l4 4 4-4" />
      <path d="M5 16.5V19h14v-2.5" />
    </>
  ),
  docs: (
    <>
      <path d="M12 6.5C10.3 5.3 7.8 5 5 5.2v12.6c2.8-.2 5.3.1 7 1.3 1.7-1.2 4.2-1.5 7-1.3V5.2c-2.8-.2-5.3.1-7 1.3Z" />
      <path d="M12 6.5V19" />
    </>
  ),
  tutorials: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="3" />
      <path d="M10.5 9.6v4.8l4-2.4Z" fill="#fff" />
    </>
  ),
};

interface GlassIconProps {
  /** Which glyph to draw; also selects the tile's color. */
  readonly name: IconName;
}

/** A decorative glass tile icon. */
export function GlassIcon({ name }: GlassIconProps): React.JSX.Element {
  return (
    <span className={`glass-icon glass-icon--${name}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">{GLYPHS[name]}</svg>
    </span>
  );
}
