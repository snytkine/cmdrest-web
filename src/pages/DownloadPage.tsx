/**
 * Download page: one card per supported OS, all pointing at the GitHub
 * releases page where the native builds are published.
 */
import { downloadTargets } from '../content/downloads';
import type { OsId } from '../content/downloads';
import { site } from '../content/site';
import { logInteraction } from '../logging';

/** Simple line-art icons for each operating system. */
const OS_ICONS: Record<OsId, React.JSX.Element> = {
  // Stylized apple silhouette.
  macos: (
    <path d="M16.5 3.5c-1 .1-2.2.7-2.9 1.6-.6.8-1.2 2-1 3.1 1.1 0 2.3-.6 3-1.5.6-.8 1.1-2 .9-3.2zM12 8.7c-1.6 0-3 .9-3.8.9-.9 0-2.2-.9-3.6-.9C2.7 8.7 1 10.4 1 13.7c0 3.5 2.6 7.8 4.6 7.8 1 0 1.7-.7 3-.7s1.9.7 3 .7c2.1 0 4.4-4 4.4-4s-2.5-1-2.5-3.9c0-2.6 2.1-3.7 2.2-3.8-1.2-1.8-3.1-2.1-3.7-2.1z" />
  ),
  // Four-pane window flag.
  windows: (
    <path d="M3 5.5 10.5 4.4V11H3V5.5zM11.5 4.2 21 3v8h-9.5V4.2zM3 12h7.5v6.6L3 17.5V12zM11.5 12H21v9l-9.5-1.4V12z" />
  ),
  // Simplified penguin.
  linux: (
    <path d="M12 2c-2.5 0-4 2-4 4.5 0 1.7-.3 2.9-1.2 4.3C5.6 12.7 4.5 14.6 4.5 17c0 1.5.6 2.6 1.5 3.3.6-1.9 2.9-1.5 3.2-.4.7.4 1.7.6 2.8.6s2.1-.2 2.8-.6c.3-1.1 2.6-1.5 3.2.4.9-.7 1.5-1.8 1.5-3.3 0-2.4-1.1-4.3-2.3-6.2-.9-1.4-1.2-2.6-1.2-4.3C16 4 14.5 2 12 2zm-1.7 5.2c.4 0 .7.4.7.9s-.3.9-.7.9-.7-.4-.7-.9.3-.9.7-.9zm3.4 0c.4 0 .7.4.7.9s-.3.9-.7.9-.7-.4-.7-.9.3-.9.7-.9z" />
  ),
};

/** The downloads page. */
export function DownloadPage(): React.JSX.Element {
  /** Logs which OS card the visitor followed to the releases page. */
  const handleDownload = (os: OsId): void => {
    logInteraction('download-click', { os });
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1 className="page-hero__title">Download {site.name}</h1>
          <p className="page-hero__lede">
            Native builds are available for macOS, Windows and Linux on the GitHub releases page.
            No Java, no runtime — download a single binary and start testing.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="download-grid">
            {downloadTargets.map((target) => (
              <div className="download-card" key={target.id} data-testid={`download-${target.id}`}>
                <svg
                  className="download-card__icon"
                  width="44"
                  height="44"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  {OS_ICONS[target.id]}
                </svg>
                <h2 className="download-card__name">{target.name}</h2>
                <p className="download-card__note">{target.note}</p>
                <a
                  className="button button--primary"
                  href={target.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => handleDownload(target.id)}
                >
                  Get for {target.name}
                </a>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center' }}>
            All builds live on the{' '}
            <a href={site.links.releases} target="_blank" rel="noreferrer">
              GitHub releases page
            </a>
            . {site.name} is open source — you can also{' '}
            <a href={site.links.sourceCode} target="_blank" rel="noreferrer">
              browse the code
            </a>{' '}
            and build it yourself.
          </p>
        </div>
      </section>
    </>
  );
}
