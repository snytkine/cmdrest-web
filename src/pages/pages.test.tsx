/**
 * Tests for the four content pages. The Matrix rain scene is mocked
 * out: jsdom has no canvas 2D context, and the scene's own logic is
 * covered by `matrixRain.test.ts` and `MatrixScene.test.tsx`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { HomePage } from './HomePage';
import { FeaturesPage } from './FeaturesPage';
import { DownloadPage } from './DownloadPage';
import { DocsPage } from './DocsPage';
import { NotFoundPage } from './NotFoundPage';
import { features, getHighlightedFeatures } from '../content/features';
import { downloadTargets } from '../content/downloads';
import { site } from '../content/site';
import { renderWithRouter, captureLogs } from '../test/helpers';
import type { CaptureTransport } from '../test/helpers';

// Replace the canvas animation with a lightweight placeholder.
vi.mock('../matrix/MatrixScene', () => ({
  MatrixScene: () => <div data-testid="matrix-scene-mock" />,
}));

/**
 * Capture-transport pair installed for the interaction-logging tests.
 * A capturing click listener prevents jsdom from attempting real
 * navigation when outbound links are clicked.
 */
let capture: CaptureTransport;
let restoreLogs: () => void;

/** Stops jsdom from following link clicks (navigation is unimplemented). */
function preventNavigation(event: Event): void {
  event.preventDefault();
}

beforeEach(() => {
  ({ capture, restore: restoreLogs } = captureLogs());
  document.addEventListener('click', preventNavigation, true);
});

afterEach(() => {
  restoreLogs();
  document.removeEventListener('click', preventNavigation, true);
});

describe('HomePage', () => {
  it('renders the hero headline and description', () => {
    renderWithRouter(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/zero code/i);
    expect(screen.getByText(site.description)).toBeInTheDocument();
  });

  it('links the primary calls to action to releases and docs', () => {
    renderWithRouter(<HomePage />);
    expect(screen.getByRole('link', { name: `Download ${site.name}` })).toHaveAttribute(
      'href',
      site.links.releases,
    );
    expect(screen.getByRole('link', { name: 'Read the docs' })).toHaveAttribute(
      'href',
      site.links.documentation,
    );
  });

  it('shows every highlighted feature as a card', () => {
    renderWithRouter(<HomePage />);
    for (const feature of getHighlightedFeatures()) {
      expect(screen.getByTestId(`feature-${feature.id}`)).toBeInTheDocument();
    }
  });

  it('names the three supported platforms', () => {
    renderWithRouter(<HomePage />);
    const platforms = screen.getByLabelText('Supported platforms');
    expect(platforms).toHaveTextContent('macOS');
    expect(platforms).toHaveTextContent('Windows');
    expect(platforms).toHaveTextContent('Linux');
  });

  it('renders the YAML and CLI example blocks', () => {
    renderWithRouter(<HomePage />);
    expect(screen.getByText('users-api.test.yaml')).toBeInTheDocument();
    expect(screen.getByText('terminal')).toBeInTheDocument();
  });

  it('logs a cta-click interaction when a hero call to action is clicked', () => {
    renderWithRouter(<HomePage />);
    fireEvent.click(screen.getByRole('link', { name: `Download ${site.name}` }));
    expect(capture.records).toContainEqual(
      expect.objectContaining({ message: 'cta-click', data: { target: 'download' } }),
    );
  });

  it('logs a distinct cta-click target for every other call to action', () => {
    renderWithRouter(<HomePage />);
    // Each entry pairs an accessible link name with the target its
    // click handler is expected to report.
    const ctas: ReadonlyArray<[string, string]> = [
      ['Read the docs', 'docs'],
      ['See all features →', 'all-features'],
      ['Download now', 'download-banner'],
      ['Star on GitHub', 'github-banner'],
    ];
    for (const [name, target] of ctas) {
      fireEvent.click(screen.getByRole('link', { name }));
      expect(capture.records).toContainEqual(
        expect.objectContaining({ message: 'cta-click', data: { target } }),
      );
    }
  });
});

describe('FeaturesPage', () => {
  it('renders every feature from the catalogue', () => {
    renderWithRouter(<FeaturesPage />);
    for (const feature of features) {
      expect(screen.getByTestId(`feature-${feature.id}`)).toBeInTheDocument();
    }
  });

  it('renders one section heading per category with a count badge', () => {
    renderWithRouter(<FeaturesPage />);
    const categories = new Set(features.map((feature) => feature.category));
    for (const category of categories) {
      expect(screen.getByRole('heading', { name: new RegExp(category) })).toBeInTheDocument();
    }
  });
});

describe('DownloadPage', () => {
  it('renders a card for each operating system', () => {
    renderWithRouter(<DownloadPage />);
    for (const target of downloadTargets) {
      const card = screen.getByTestId(`download-${target.id}`);
      expect(card).toHaveTextContent(target.name);
    }
  });

  it('links every download button to the releases page', () => {
    renderWithRouter(<DownloadPage />);
    for (const target of downloadTargets) {
      expect(screen.getByRole('link', { name: `Get for ${target.name}` })).toHaveAttribute(
        'href',
        site.links.releases,
      );
    }
  });

  it('mentions that no runtime is required', () => {
    renderWithRouter(<DownloadPage />);
    expect(screen.getByText(/No Java, no runtime/)).toBeInTheDocument();
  });

  it('logs a download-click interaction naming the chosen OS', () => {
    renderWithRouter(<DownloadPage />);
    for (const target of downloadTargets) {
      fireEvent.click(screen.getByRole('link', { name: `Get for ${target.name}` }));
      expect(capture.records).toContainEqual(
        expect.objectContaining({ message: 'download-click', data: { os: target.id } }),
      );
    }
  });
});

describe('DocsPage', () => {
  it('renders resource cards for docs, source and releases', () => {
    renderWithRouter(<DocsPage />);
    expect(screen.getByTestId('resource-documentation')).toHaveAttribute(
      'href',
      site.links.documentation,
    );
    expect(screen.getByTestId('resource-source')).toHaveAttribute('href', site.links.sourceCode);
    expect(screen.getByTestId('resource-releases')).toHaveAttribute('href', site.links.releases);
  });

  it('shows the quick-start YAML example', () => {
    renderWithRouter(<DocsPage />);
    expect(screen.getByText('users-api.test.yaml')).toBeInTheDocument();
  });

  it('logs a docs-resource-click interaction naming the resource', () => {
    renderWithRouter(<DocsPage />);
    fireEvent.click(screen.getByTestId('resource-documentation'));
    expect(capture.records).toContainEqual(
      expect.objectContaining({
        message: 'docs-resource-click',
        data: { resource: 'documentation' },
      }),
    );
  });
});

describe('NotFoundPage', () => {
  it('shows a 404 message and a link back home', () => {
    renderWithRouter(<NotFoundPage />);
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });
});
