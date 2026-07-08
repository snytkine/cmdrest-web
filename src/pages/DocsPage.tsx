/**
 * Docs section shell: page hero plus a two-column layout with the
 * sidebar navigation (one link per configured documentation page and
 * the Examples page) and the routed document content.
 */
import { NavLink, Outlet } from 'react-router-dom';
import { docNavItems } from '../docs/config';
import { logInteraction } from '../logging';

/** The documentation section layout rendered at `/docs/*`. */
export function DocsPage(): React.JSX.Element {
  /** Logs which documentation page the visitor opened. */
  const handleOpen = (title: string): void => {
    logInteraction('docs-nav-click', { page: title });
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1 className="page-hero__title">Documentation</h1>
          <p className="page-hero__lede">
            Everything you need to write your first suite — and your five-hundredth.
          </p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container docs-layout">
          <aside className="docs-nav" aria-label="Documentation pages">
            {docNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/docs'}
                className={({ isActive }) =>
                  isActive ? 'docs-nav__link docs-nav__link--active' : 'docs-nav__link'
                }
                onClick={() => handleOpen(item.title)}
              >
                {item.title}
              </NavLink>
            ))}
          </aside>
          <div className="docs-content">
            <Outlet />
          </div>
        </div>
      </section>
    </>
  );
}
