/**
 * Sticky top navigation bar.
 *
 * Desktop: brand on the left, page links plus a GitHub link on the right.
 * Mobile (<=760px): the links collapse behind a hamburger button into a
 * dropdown panel. Menu toggles and outbound clicks are logged through
 * the site's logging framework.
 */
import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { navItems, site } from '../content/site';
import { logInteraction } from '../logging';

/** Small terminal-window logo mark rendered next to the brand name. */
function LogoMark(): React.JSX.Element {
  return (
    <svg className="navbar__logo" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="4" y="4" width="56" height="56" rx="12" fill="#0f172a" />
      <path
        d="M18 24 L30 33 L18 42"
        fill="none"
        stroke="#4ade80"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="34" y="40" width="14" height="5" rx="2.5" fill="#4ade80" />
    </svg>
  );
}

/** The site-wide navigation bar. */
export function NavBar(): React.JSX.Element {
  // Whether the mobile dropdown menu is currently open.
  const [menuOpen, setMenuOpen] = useState(false);

  /** Toggles the mobile menu and logs the interaction. */
  const handleToggle = (): void => {
    setMenuOpen((open) => {
      logInteraction('nav-menu-toggle', { open: !open });
      return !open;
    });
  };

  /** Closes the mobile menu after a navigation link is clicked. */
  const handleNavigate = (label: string): void => {
    logInteraction('nav-link-click', { label });
    setMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand" onClick={() => handleNavigate('brand')}>
          <LogoMark />
          {site.name}
        </Link>

        {/* Hamburger toggle — only visible on small screens (CSS). */}
        <button
          type="button"
          className="navbar__toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={handleToggle}
        >
          {/* Simple hamburger / close glyph depending on state. */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <nav
          id="primary-navigation"
          className={`navbar__links${menuOpen ? ' navbar__links--open' : ''}`}
          aria-label="Primary"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              // NavLink exposes `isActive` so the current page gets the
              // highlighted pill style.
              className={({ isActive }) =>
                `navbar__link${isActive ? ' navbar__link--active' : ''}`
              }
              onClick={() => handleNavigate(item.label)}
            >
              {item.label}
            </NavLink>
          ))}
          <a
            className="button button--secondary navbar__github"
            href={site.links.sourceCode}
            target="_blank"
            rel="noreferrer"
            onClick={() => logInteraction('outbound-click', { target: 'github-navbar' })}
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
