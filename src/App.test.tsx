/**
 * Integration tests for the full application: routing between pages via
 * the navbar, the shared layout chrome, page-view logging and scroll
 * restoration on navigation.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { renderWithRouter, captureLogs } from './test/helpers';

// The Matrix rain scene needs a canvas 2D context that jsdom cannot
// provide; it is unit-tested separately in matrixRain.test.ts and
// MatrixScene.test.tsx.
vi.mock('./matrix/MatrixScene', () => ({
  MatrixScene: () => <div data-testid="matrix-scene-mock" />,
}));

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
    expect(
      screen.getByRole('heading', { name: /Every feature, built for speed/ }),
    ).toBeInTheDocument();
  });

  it('navigates to the Download page through the navbar', async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />);
    await user.click(screen.getByRole('link', { name: 'Download' }));
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
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
  });
});
