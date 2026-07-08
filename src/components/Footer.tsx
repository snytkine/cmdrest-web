/**
 * Site footer: brand blurb (with the open-source note) and a column of
 * project links — source code, releases and the documentation section.
 */
import { Link } from 'react-router-dom';
import { site } from '../content/site';
import { logInteraction } from '../logging';

/** The site-wide footer. */
export function Footer(): React.JSX.Element {
  // Compute the year at render time so the notice never goes stale.
  const year = new Date().getFullYear();

  /** Logs clicks on outbound footer links. */
  const handleClick = (target: string): void => {
    logInteraction('outbound-click', { target: `footer-${target}` });
  };

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          <div className="footer__brand">{site.name}</div>
          <p className="footer__note">
            {site.name} is a free and open source project. The full source code is available on{' '}
            <a href={site.links.sourceCode} target="_blank" rel="noreferrer" onClick={() => handleClick('github')}>
              GitHub
            </a>
            . © {year} {site.name}.
          </p>
        </div>
        <nav className="footer__links" aria-label="Project links">
          <span className="footer__heading">Project</span>
          <a href={site.links.sourceCode} target="_blank" rel="noreferrer" onClick={() => handleClick('source')}>
            Source code
          </a>
          <a href={site.links.releases} target="_blank" rel="noreferrer" onClick={() => handleClick('releases')}>
            Releases &amp; downloads
          </a>
          <Link to="/docs" onClick={() => handleClick('docs')}>
            Documentation
          </Link>
        </nav>
      </div>
    </footer>
  );
}
