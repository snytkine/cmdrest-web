/**
 * 404 page rendered for any unknown route, styled as a terminal error.
 */
import { Link } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';

/** Terminal output shown on the 404 page. */
const NOT_FOUND_OUTPUT = `$ cmdrest get /this-page
✖ 404 Not Found — the requested page does not exist.

assertion failed: expected status 200, received 404`;

/** The catch-all "page not found" route. */
export function NotFoundPage(): React.JSX.Element {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640, textAlign: 'center' }}>
        <h1 className="page-hero__title">404</h1>
        <CodeBlock title="terminal" code={NOT_FOUND_OUTPUT} />
        <p style={{ marginTop: 28 }}>
          <Link className="button button--primary" to="/">
            Back to home
          </Link>
        </p>
      </div>
    </section>
  );
}
