/**
 * Renders one tutorial page inside the tutorials section.
 *
 * The slug comes either from the route parameter (`/tutorials/:slug`) or
 * from the `slug` prop (used by the `/tutorials` index route to show the
 * first page). Unlike {@link DocArticlePage}, tutorial content is a
 * bundled React component (see `src/tutorials/config.ts`), so there is no
 * async markdown fetch/render step.
 */
import { useParams } from 'react-router-dom';
import { getTutorialPage } from '../tutorials/config';
import { NotFoundPage } from './NotFoundPage';

/** Props of the {@link TutorialArticlePage} component. */
export interface TutorialArticlePageProps {
  /** Page slug override; when omitted the `:slug` route param is used. */
  readonly slug?: string;
}

/** One tutorial page: title, description and its content component. */
export function TutorialArticlePage({ slug }: TutorialArticlePageProps): React.JSX.Element {
  const params = useParams<{ slug: string }>();
  const page = getTutorialPage(slug ?? params.slug ?? '');

  if (page === undefined) {
    return <NotFoundPage />;
  }

  const { Content } = page;

  return (
    <article className="markdown" data-testid={`tutorial-${page.slug}`}>
      <h1>{page.title}</h1>
      <p className="tutorial-description">{page.description}</p>
      <Content />
    </article>
  );
}
