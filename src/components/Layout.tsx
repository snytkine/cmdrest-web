/**
 * Application shell shared by every page: decorative background, sticky
 * navbar, the routed page content (<Outlet/>) and the footer.
 *
 * The layout also owns two routing side effects:
 * - every navigation is logged as a page view,
 * - the window scrolls back to the top on route change (SPA routers
 *   preserve scroll position by default, which feels wrong for a
 *   multi-page marketing site).
 */
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NavBar } from './NavBar';
import { Footer } from './Footer';
import { TechBackground } from './TechBackground';
import { logPageView } from '../logging';

/** The shared page chrome around all routed pages. */
export function Layout(): React.JSX.Element {
  const location = useLocation();

  // Runs on every route change (pathname is the dependency).
  useEffect(() => {
    // Record the navigation in the logging framework.
    logPageView(location.pathname);
    // Reset scroll so each page starts at the top.
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <>
      <TechBackground />
      <div className="app-shell">
        <NavBar />
        <main className="app-shell__main">
          <Outlet />
        </main>
        <Footer />
      </div>
    </>
  );
}
