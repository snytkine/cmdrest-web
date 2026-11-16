/**
 * Animated transition between the site's top-level pages.
 *
 * When the router moves to a different section (Home, Features, Docs,
 * ...), the page on screen first animates out; only when that animation
 * ends is the new page swapped in, scrolled to the top and animated in.
 * To make that possible this component keeps its own copy of the
 * location that is *displayed* and hands it to the routes, which lags
 * behind the router's location for the length of the exit animation.
 *
 * Navigation inside a section (one docs article to another) is not
 * animated: the section's own sidebar stays put and only the article
 * changes, so the displayed location follows the router immediately.
 *
 * The animations themselves are the `.page--enter` / `.page--exit`
 * rules in global.css.
 */
import { useEffect, useState } from 'react';
import type { AnimationEvent, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { Location } from 'react-router-dom';

interface PageTransitionProps {
  /** Renders the routes for the location currently on screen. */
  readonly children: (location: Location) => ReactNode;
}

/** The top-level section a path belongs to: `/docs/hooks` -> `docs`, `/` -> ``. */
function sectionOf(pathname: string): string {
  return pathname.split('/')[1] ?? '';
}

/** Animates the old page out, then swaps in the new page and animates it in. */
export function PageTransition({ children }: PageTransitionProps): React.JSX.Element {
  const location = useLocation();
  const [displayed, setDisplayed] = useState(location);

  // While the router is in a different section than the one on screen,
  // the old page is leaving.
  const leaving = sectionOf(location.pathname) !== sectionOf(displayed.pathname);

  // Inside a section there is nothing to animate: follow the router at
  // once (adjusting state during render avoids painting a stale page).
  if (!leaving && displayed.key !== location.key) {
    setDisplayed(location);
  }
  const shown = leaving ? displayed : location;

  // In-section navigation starts the new article at the top, like a
  // regular page load would.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [shown.pathname]);

  /** Swaps in the new page once the exit animation of the wrapper ends. */
  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>): void => {
    // Ignore animations bubbling up from inside the page, and the end
    // of the enter animation.
    if (event.target !== event.currentTarget || !leaving) return;
    // Jump (not smooth-scroll) to the top while nothing is visible.
    window.scrollTo({ top: 0, behavior: 'instant' });
    setDisplayed(location);
  };

  return (
    <div
      className={`page page--${leaving ? 'exit' : 'enter'}`}
      data-testid="page-transition"
      onAnimationEnd={handleAnimationEnd}
    >
      {children(shown)}
    </div>
  );
}
