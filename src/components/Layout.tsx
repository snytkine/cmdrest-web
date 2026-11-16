/**
 * Application shell shared by every page: decorative background, sticky
 * navbar, the routed page content (passed as children) and the footer.
 *
 * The layout also logs every navigation as a page view. Scrolling back
 * to the top on route change is handled by {@link PageTransition}, which
 * knows when the new page is actually swapped in.
 */
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { NavBar } from './NavBar';
import { Footer } from './Footer';
import { TechBackground } from './TechBackground';
import { logPageView } from '../logging';

interface LayoutProps {
  /** The routed page content rendered between navbar and footer. */
  readonly children: ReactNode;
}

/** The shared page chrome around all routed pages. */
export function Layout({ children }: LayoutProps): React.JSX.Element {
  const location = useLocation();

  // Record every route change (pathname is the dependency) in the
  // logging framework.
  useEffect(() => {
    logPageView(location.pathname);
  }, [location.pathname]);

  return (
    <>
      <TechBackground />
      <div className="app-shell">
        <NavBar />
        <main className="app-shell__main">{children}</main>
        <Footer />
      </div>
    </>
  );
}
