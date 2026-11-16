/**
 * Light/dark theme state.
 *
 * The active theme lives in the `data-theme` attribute of `<html>`; the
 * stylesheet swaps its color tokens based on it. An inline script in
 * `index.html` sets the attribute before first paint (from the saved
 * choice, falling back to the system preference) so there is no flash
 * of the wrong theme; this hook picks the value up from there, keeps the
 * attribute in sync and remembers the visitor's choice.
 */
import { useCallback, useEffect, useState } from 'react';

/** The two color themes the site supports. */
export type Theme = 'light' | 'dark';

/** localStorage key holding the visitor's explicit choice (also read by index.html). */
export const THEME_STORAGE_KEY = 'cmdrest-theme';

/** Reads the theme that index.html applied before first paint. */
function initialTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** Returns the active theme and a function that flips it. */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  // Mirror the state onto <html> so the CSS tokens follow it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback((): void => {
    setTheme((current) => {
      const next: Theme = current === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Storage can be unavailable (private mode); the toggle still
        // works for this visit.
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
