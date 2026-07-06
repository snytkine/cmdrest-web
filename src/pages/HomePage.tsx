/**
 * Home page: hero with the 3D network animation, highlighted features,
 * a YAML + CLI demo section and a closing call-to-action banner.
 */
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { site } from '../content/site';
import { getHighlightedFeatures } from '../content/features';
import { yamlExample, cliExample } from '../content/snippets';
import { FeatureCard } from '../components/FeatureCard';
import { CodeBlock } from '../components/CodeBlock';
import { SectionHeading } from '../components/SectionHeading';
import { logInteraction } from '../logging';

/**
 * The three.js scene is code-split with React.lazy so the (large) three.js
 * bundle does not block the first paint of the hero text; the Suspense
 * fallback keeps the layout stable while it loads.
 */
const NetworkScene = lazy(() =>
  import('../three/NetworkScene').then((module) => ({ default: module.NetworkScene })),
);

/** The landing page. */
export function HomePage(): React.JSX.Element {
  /** Logs clicks on the primary hero calls to action. */
  const handleCta = (target: string): void => {
    logInteraction('cta-click', { target });
  };

  return (
    <>
      {/* ---- Hero -------------------------------------------------- */}
      <section className="hero">
        <div className="container hero__inner">
          <div>
            <span className="hero__badge">Open source · Free forever</span>
            <h1 className="hero__title">
              Test REST APIs with <em>zero code</em>, straight from your terminal.
            </h1>
            <p className="hero__lede">{site.description}</p>
            <div className="hero__actions">
              <a
                className="button button--primary"
                href={site.links.releases}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleCta('download')}
              >
                Download {site.name}
              </a>
              <a
                className="button button--secondary"
                href={site.links.documentation}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleCta('docs')}
              >
                Read the docs
              </a>
            </div>
            <div className="hero__platforms" aria-label="Supported platforms">
              <span>macOS</span>
              <span>Windows</span>
              <span>Linux</span>
            </div>
          </div>
          <div className="hero__scene" data-testid="hero-scene">
            {/* Empty fallback: the reserved box simply stays blank until
                the 3D bundle arrives. */}
            <Suspense fallback={null}>
              <NetworkScene />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ---- Feature highlights ------------------------------------- */}
      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Why CmdRest"
            title="Everything an API test runner should be"
            lede="Declarative YAML suites, native-binary speed and reports you will actually want to share."
          />
          <div className="feature-grid">
            {getHighlightedFeatures().map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 36 }}>
            <Link to="/features" onClick={() => handleCta('all-features')}>
              See all features →
            </Link>
          </p>
        </div>
      </section>

      {/* ---- YAML / CLI demo ----------------------------------------- */}
      <section className="section section--tight">
        <div className="container">
          <SectionHeading
            eyebrow="How it works"
            title="A test suite is just a YAML file"
            lede="Describe requests and assertions declaratively, then run them with a single native binary."
          />
          <div className="demo">
            <CodeBlock title="users-api.test.yaml" code={yamlExample} />
            <CodeBlock title="terminal" code={cliExample} />
          </div>
        </div>
      </section>

      {/* ---- Closing call to action ------------------------------------ */}
      <section className="section">
        <div className="container">
          <div className="cta-banner">
            <h2 className="cta-banner__title">
              Ready to ship <em>tested</em> APIs?
            </h2>
            <p>
              Grab a native build for macOS, Windows or Linux and run your first suite in minutes.
            </p>
            <div className="cta-banner__actions">
              <a
                className="button button--primary"
                href={site.links.releases}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleCta('download-banner')}
              >
                Download now
              </a>
              <a
                className="button button--secondary"
                href={site.links.sourceCode}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleCta('github-banner')}
              >
                Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
