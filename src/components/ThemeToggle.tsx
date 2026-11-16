/**
 * Light/dark theme switch shown at the right end of the navbar: a
 * macOS-style sliding switch flanked by a sun and a moon glyph.
 */
import type { Theme } from '../hooks/useTheme';

interface ThemeToggleProps {
  /** The theme currently applied. */
  readonly theme: Theme;
  /** Called when the visitor flips the switch. */
  readonly onToggle: () => void;
}

/** The theme switch. Exposed to assistive technology as a "Dark mode" switch. */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps): React.JSX.Element {
  const dark = theme === 'dark';
  return (
    <div className="theme-toggle">
      {/* Sun */}
      <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
      </svg>
      <button
        type="button"
        className="switch"
        role="switch"
        aria-checked={dark}
        aria-label="Dark mode"
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={onToggle}
      >
        <span className="switch__knob" />
      </button>
      {/* Moon */}
      <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z" />
      </svg>
    </div>
  );
}
