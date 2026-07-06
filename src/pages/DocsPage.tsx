/**
 * Docs page: cards linking to the documentation site, the GitHub
 * repository and the releases page, plus a quick-start YAML example.
 */
import { site } from '../content/site';
import { yamlExample } from '../content/snippets';
import { CodeBlock } from '../components/CodeBlock';
import { SectionHeading } from '../components/SectionHeading';
import { logInteraction } from '../logging';

/** Data for the three outbound resource cards. */
const RESOURCES = [
  {
    id: 'documentation',
    title: 'Test suite configuration guide',
    description:
      'The complete reference for writing .yaml test suites: requests, assertions, hooks, templates and more.',
    url: site.links.documentation,
  },
  {
    id: 'source',
    title: 'Source code on GitHub',
    description:
      'CmdRest is fully open source. Read the code, open issues and contribute improvements.',
    url: site.links.sourceCode,
  },
  {
    id: 'releases',
    title: 'Releases & changelogs',
    description:
      'Native builds for macOS, Windows and Linux, with release notes for every version.',
    url: site.links.releases,
  },
] as const;

/** The documentation hub page. */
export function DocsPage(): React.JSX.Element {
  /** Logs which resource card the visitor opened. */
  const handleOpen = (id: string): void => {
    logInteraction('docs-resource-click', { resource: id });
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1 className="page-hero__title">Documentation &amp; resources</h1>
          <p className="page-hero__lede">
            Everything you need to write your first suite — and your five-hundredth.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="link-card-grid">
            {RESOURCES.map((resource) => (
              <a
                className="link-card"
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleOpen(resource.id)}
                data-testid={`resource-${resource.id}`}
              >
                <span className="link-card__title">
                  {resource.title}
                  <span className="link-card__arrow" aria-hidden="true">
                    →
                  </span>
                </span>
                <p style={{ margin: 0 }}>{resource.description}</p>
              </a>
            ))}
          </div>

          <SectionHeading
            eyebrow="Quick start"
            title="Your first test suite"
            lede="Save this as users-api.test.yaml and run it with `cmdrest run users-api.test.yaml`."
          />
          <CodeBlock title="users-api.test.yaml" code={yamlExample} />
        </div>
      </section>
    </>
  );
}
