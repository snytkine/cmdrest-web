/**
 * Integration tests for the full application: routing between pages via
 * the navbar (including the animated page transition), the shared
 * layout chrome, page-view logging and scroll restoration on navigation.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { renderWithRouter, captureLogs } from './test/helpers';

// The canvas scenes need a 2D context that jsdom cannot provide; they
// are unit-tested separately in matrixRain.test.ts / MatrixScene.test.tsx
// and wordRain.test.ts / WordRainScene.test.tsx.
vi.mock('./matrix/MatrixScene', () => ({
  MatrixScene: () => <div data-testid="matrix-scene-mock" />,
}));

vi.mock('./wordrain/WordRainScene', () => ({
  WordRainScene: () => <div data-testid="wordrain-scene-mock" />,
}));

/**
 * Ends the exit animation of the page on screen. jsdom does not run CSS
 * animations, so tests fire the `animationend` event that makes
 * PageTransition swap in the page that was navigated to.
 */
function finishPageTransition(): void {
  fireEvent.animationEnd(screen.getByTestId('page-transition'));
}

/** Restore function of the log capture installed per-test. */
let restoreLogs: (() => void) | undefined;

afterEach(() => {
  restoreLogs?.();
  restoreLogs = undefined;
});

describe('App routing', () => {
  it('renders the home page with navbar and footer at /', () => {
    renderWithRouter(<App />);
    // Hero headline proves the home page rendered.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/zero code/i);
    // Layout chrome is present on every page.
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByText(/free and open source/i)).toBeInTheDocument();
  });

  it('navigates to the Features page through the navbar', async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />);
    await user.click(screen.getByRole('link', { name: 'Features' }));
    // The home page stays up while it animates out...
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/zero code/i);
    // ...and the Features page replaces it when that animation ends.
    finishPageTransition();
    expect(
      screen.getByRole('heading', { name: /Every feature, built for speed/ }),
    ).toBeInTheDocument();
  });

  it('navigates to the Download page through the navbar', async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />);
    await user.click(screen.getByRole('link', { name: 'Download' }));
    finishPageTransition();
    expect(screen.getByRole('heading', { name: /Download CmdRest/ })).toBeInTheDocument();
  });

  it('renders the docs section at /docs with the introduction document', async () => {
    renderWithRouter(<App />, '/docs');
    expect(screen.getByRole('heading', { name: 'Documentation' })).toBeInTheDocument();
    // The index route loads and renders the first configured document.
    expect(await screen.findByTestId('doc-introduction')).toBeInTheDocument();
  });

  it('renders a documentation page at /docs/<slug>', async () => {
    renderWithRouter(<App />, '/docs/cli-reference');
    expect(await screen.findByTestId('doc-cli-reference')).toBeInTheDocument();
  });

  it('renders the Examples page at /docs/examples', () => {
    renderWithRouter(<App />, '/docs/examples');
    expect(screen.getByRole('heading', { name: 'Your first test suite' })).toBeInTheDocument();
  });

  it('renders the tutorials section at /tutorials with the first tutorial', () => {
    renderWithRouter(<App />, '/tutorials');
    expect(screen.getByRole('heading', { name: 'Tutorials' })).toBeInTheDocument();
    // The index route loads and renders the first configured tutorial.
    expect(screen.getByTestId('tutorial-download-and-install')).toBeInTheDocument();
  });

  it('renders a tutorial page at /tutorials/<slug>', () => {
    renderWithRouter(<App />, '/tutorials/download-and-install');
    expect(screen.getByTestId('tutorial-download-and-install')).toBeInTheDocument();
  });

  it('navigates to the Tutorials page through the navbar', async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />);
    await user.click(screen.getByRole('link', { name: 'Tutorials' }));
    finishPageTransition();
    expect(screen.getByRole('heading', { name: 'Tutorials' })).toBeInTheDocument();
  });

  it('shows the 404 page for unknown paths', () => {
    renderWithRouter(<App />, '/no-such-page');
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
  });

  it('logs a page view on initial render and on navigation', async () => {
    const { capture, restore } = captureLogs();
    restoreLogs = restore;
    const user = userEvent.setup();
    renderWithRouter(<App />);

    // The initial route is logged as a page view...
    const initialViews = capture.records.filter((record) => record.message === 'page-view');
    expect(initialViews.length).toBeGreaterThanOrEqual(1);
    expect(initialViews[0]?.data).toEqual({ path: '/' });

    // ...and navigating logs the new path.
    await user.click(screen.getByRole('link', { name: 'Docs' }));
    const paths = capture.records
      .filter((record) => record.message === 'page-view')
      .map((record) => (record.data as { path: string }).path);
    expect(paths).toContain('/docs');
  });

  it('scrolls back to the top on route change', async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />);
    vi.mocked(window.scrollTo).mockClear();
    await user.click(screen.getByRole('link', { name: 'Features' }));
    // The old page must not jump while it is still animating out.
    expect(window.scrollTo).not.toHaveBeenCalled();
    finishPageTransition();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });

  it('switches documentation pages without a transition', async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />, '/docs');
    vi.mocked(window.scrollTo).mockClear();
    await user.click(screen.getByRole('link', { name: 'CLI Reference' }));
    expect(screen.getByTestId('page-transition')).toHaveClass('page--enter');
    expect(await screen.findByTestId('doc-cli-reference')).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
  });
});
