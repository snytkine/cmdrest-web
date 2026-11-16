/**
 * Tests for the page transition: the old page stays on screen while it
 * animates out, the new one is swapped in when that animation ends, and
 * navigation inside a section is not animated.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router-dom';
import { PageTransition } from './PageTransition';

/** Renders a transition whose "page" is just the displayed pathname. */
function renderTransition(initialPath = '/one'): {
  content: () => HTMLElement;
  page: () => HTMLElement;
} {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Link to="/two">go</Link>
      <Link to="/one/deeper">deeper</Link>
      <PageTransition>
        {(location) => <p data-testid="content">{location.pathname}</p>}
      </PageTransition>
    </MemoryRouter>,
  );
  return {
    content: () => screen.getByTestId('content'),
    page: () => screen.getByTestId('page-transition'),
  };
}

beforeEach(() => {
  vi.mocked(window.scrollTo).mockClear();
});

describe('PageTransition', () => {
  it('shows the current page with the enter animation', () => {
    const { content, page } = renderTransition();
    expect(content()).toHaveTextContent('/one');
    expect(page()).toHaveClass('page--enter');
  });

  it('keeps the old page on screen while it animates out', async () => {
    const { content, page } = renderTransition();
    await userEvent.click(screen.getByRole('link', { name: 'go' }));
    expect(page()).toHaveClass('page--exit');
    expect(content()).toHaveTextContent('/one');
  });

  it('swaps in the new page and jumps to the top when the exit animation ends', async () => {
    const { content, page } = renderTransition();
    await userEvent.click(screen.getByRole('link', { name: 'go' }));
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.animationEnd(page());
    expect(content()).toHaveTextContent('/two');
    expect(page()).toHaveClass('page--enter');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });

  it('ignores animations that end inside the page', async () => {
    const { content, page } = renderTransition();
    await userEvent.click(screen.getByRole('link', { name: 'go' }));
    fireEvent.animationEnd(content());
    expect(content()).toHaveTextContent('/one');
    expect(page()).toHaveClass('page--exit');
  });

  it('does nothing when the enter animation ends', () => {
    const { content, page } = renderTransition();
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.animationEnd(page());
    expect(content()).toHaveTextContent('/one');
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('switches pages inside a section immediately, without an exit animation', async () => {
    const { content, page } = renderTransition();
    vi.mocked(window.scrollTo).mockClear();
    await userEvent.click(screen.getByRole('link', { name: 'deeper' }));
    expect(content()).toHaveTextContent('/one/deeper');
    expect(page()).toHaveClass('page--enter');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it('animates out the page actually on screen after in-section navigation', async () => {
    const { content, page } = renderTransition();
    await userEvent.click(screen.getByRole('link', { name: 'deeper' }));
    await userEvent.click(screen.getByRole('link', { name: 'go' }));
    expect(page()).toHaveClass('page--exit');
    expect(content()).toHaveTextContent('/one/deeper');
  });
});
