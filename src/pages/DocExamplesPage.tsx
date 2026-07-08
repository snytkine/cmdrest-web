/**
 * Examples page of the documentation section. Currently hosts the
 * "Your first test suite" quick-start example that used to live on the
 * docs landing page; more worked examples can be added over time.
 */
import { yamlExample } from '../content/snippets';
import { CodeBlock } from '../components/CodeBlock';

/** The `/docs/examples` page. */
export function DocExamplesPage(): React.JSX.Element {
  return (
    <article className="markdown">
      <h1>Your first test suite</h1>
      <p>
        Save this as <code>users-api.test.yaml</code> and run it with{' '}
        <code>cmdrest run users-api.test.yaml</code>.
      </p>
      <CodeBlock title="users-api.test.yaml" code={yamlExample} />
    </article>
  );
}
