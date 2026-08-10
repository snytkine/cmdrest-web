/**
 * Tutorials section shell: page hero plus a two-column layout with the
 * sidebar navigation (one link per configured tutorial) and the routed
 * tutorial content. Mirrors the layout of {@link DocsPage}.
 */
import { NavLink, Outlet } from 'react-router-dom';
import { tutorialPages } from '../tutorials/config';
import { logInteraction } from '../logging';

/** The tutorials section layout rendered at `/tutorials/*`. */
export function TutorialsPage(): React.JSX.Element {
  /** Logs which tutorial the visitor opened. */
  const handleOpen = (title: string): void => {
    logInteraction('tutorials-nav-click', { page: title });
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1 className="page-hero__title">Tutorials</h1>
          <p className="page-hero__lede">Step-by-step, video-led walkthroughs of CmdRest.</p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container docs-layout">
          <aside className="docs-nav" aria-label="Tutorial pages">
            {tutorialPages.map((page, index) => (
              <NavLink
                key={page.slug}
                to={index === 0 ? '/tutorials' : `/tutorials/${page.slug}`}
                end={index === 0}
                className={({ isActive }) =>
                  isActive ? 'docs-nav__link docs-nav__link--active' : 'docs-nav__link'
                }
                onClick={() => handleOpen(page.title)}
              >
                {page.title}
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
