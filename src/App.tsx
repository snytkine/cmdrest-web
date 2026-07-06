/**
 * Root application component: declares the route table.
 *
 * Every page renders inside {@link Layout} (navbar + footer + decorative
 * background); the index route is the home page and a catch-all `*`
 * route renders the 404 page.
 */
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { FeaturesPage } from './pages/FeaturesPage';
import { DownloadPage } from './pages/DownloadPage';
import { DocsPage } from './pages/DocsPage';
import { NotFoundPage } from './pages/NotFoundPage';

/** The application's route table. */
export function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="features" element={<FeaturesPage />} />
        <Route path="download" element={<DownloadPage />} />
        <Route path="docs" element={<DocsPage />} />
        {/* Catch-all: any unknown path shows the 404 page. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
