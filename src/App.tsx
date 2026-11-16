/**
 * Root application component: declares the route table.
 *
 * Every page renders inside {@link Layout} (navbar + footer + decorative
 * background) and {@link PageTransition}, which animates the switch
 * between top-level pages. The transition decides which location is on
 * screen, so the routes are rendered for the location it provides rather
 * than the router's current one. A catch-all `*` route renders the 404
 * page.
 */
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PageTransition } from './components/PageTransition';
import { HomePage } from './pages/HomePage';
import { FeaturesPage } from './pages/FeaturesPage';
import { DownloadPage } from './pages/DownloadPage';
import { DocsPage } from './pages/DocsPage';
import { DocArticlePage } from './pages/DocArticlePage';
import { DocExamplesPage } from './pages/DocExamplesPage';
import { TutorialsPage } from './pages/TutorialsPage';
import { TutorialArticlePage } from './pages/TutorialArticlePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { firstDocPage, EXAMPLES_SLUG } from './docs/config';
import { firstTutorialPage } from './tutorials/config';

/** The application's route table. */
export function App(): React.JSX.Element {
  return (
    <Layout>
      <PageTransition>
        {(location) => (
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="features" element={<FeaturesPage />} />
            <Route path="download" element={<DownloadPage />} />
            <Route path="docs" element={<DocsPage />}>
              {/* The docs index shows the first configured page in place. */}
              <Route index element={<DocArticlePage slug={firstDocPage.slug} />} />
              <Route path={EXAMPLES_SLUG} element={<DocExamplesPage />} />
              <Route path=":slug" element={<DocArticlePage />} />
            </Route>
            <Route path="tutorials" element={<TutorialsPage />}>
              {/* The tutorials index shows the first configured tutorial in place. */}
              <Route index element={<TutorialArticlePage slug={firstTutorialPage.slug} />} />
              <Route path=":slug" element={<TutorialArticlePage />} />
            </Route>
            {/* Catch-all: any unknown path shows the 404 page. */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        )}
      </PageTransition>
    </Layout>
  );
}
