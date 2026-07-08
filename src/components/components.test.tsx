/**
 * Tests for the small presentational components: FeatureIcon,
 * FeatureCard, CodeBlock, SectionHeading, TechBackground and Footer.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureIcon } from './FeatureIcon';
import { FeatureCard } from './FeatureCard';
import { CodeBlock } from './CodeBlock';
import { SectionHeading } from './SectionHeading';
import { TechBackground } from './TechBackground';
import { Footer } from './Footer';
import { features } from '../content/features';
import { site } from '../content/site';
import { captureLogs, renderWithRouter } from '../test/helpers';
import type { Feature } from '../content/features';

describe('FeatureIcon', () => {
  it('renders an svg for every icon used by the feature catalogue', () => {
    // Rendering all icons at once proves every icon key has path data.
    for (const feature of features) {
      const { container, unmount } = render(<FeatureIcon name={feature.icon} />);
      const svg = container.querySelector(`svg[data-icon="${feature.icon}"]`);
      expect(svg).not.toBeNull();
      unmount();
    }
  });

  it('honours the size prop', () => {
    const { container } = render(<FeatureIcon name="bolt" size={40} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '40');
  });

  it('is hidden from assistive technology', () => {
    const { container } = render(<FeatureIcon name="lock" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('FeatureCard', () => {
  const feature: Feature = {
    id: 'sample',
    title: 'Sample Feature',
    description: 'Does something wonderful.',
    icon: 'bolt',
    category: 'Performance',
  };

  it('renders the feature title, description and icon', () => {
    render(<FeatureCard feature={feature} />);
    expect(screen.getByRole('heading', { name: 'Sample Feature' })).toBeInTheDocument();
    expect(screen.getByText('Does something wonderful.')).toBeInTheDocument();
    expect(screen.getByTestId('feature-sample').querySelector('svg[data-icon="bolt"]')).not.toBeNull();
  });
});

describe('CodeBlock', () => {
  it('renders the code content verbatim', () => {
    render(<CodeBlock code={'line one\nline two'} />);
    expect(screen.getByText(/line one/)).toBeInTheDocument();
  });

  it('shows the title when provided', () => {
    render(<CodeBlock code="x" title="suite.yaml" />);
    expect(screen.getByText('suite.yaml')).toBeInTheDocument();
  });

  it('omits the title element when no title is given', () => {
    const { container } = render(<CodeBlock code="x" />);
    expect(container.querySelector('.code-block__title')).toBeNull();
  });
});

describe('SectionHeading', () => {
  it('renders eyebrow, title and lede', () => {
    render(<SectionHeading eyebrow="Why" title="Big Title" lede="Some supporting text." />);
    expect(screen.getByText('Why')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Big Title' })).toBeInTheDocument();
    expect(screen.getByText('Some supporting text.')).toBeInTheDocument();
  });

  it('omits the lede paragraph when not provided', () => {
    const { container } = render(<SectionHeading eyebrow="Why" title="Big Title" />);
    expect(container.querySelector('.section-heading__lede')).toBeNull();
  });
});

describe('TechBackground', () => {
  it('renders a decorative, aria-hidden layer with three drawings', () => {
    render(<TechBackground />);
    const layer = screen.getByTestId('tech-background');
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    // Grid + architecture diagram + pipeline diagram.
    expect(layer.querySelectorAll('svg')).toHaveLength(3);
  });
});

describe('Footer', () => {
  // The footer contains a router <Link> to the internal docs section,
  // so it must render inside a router.
  it('mentions the open source nature and links to the project resources', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText(/free and open source/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Source code' })).toHaveAttribute(
      'href',
      site.links.sourceCode,
    );
    expect(screen.getByRole('link', { name: /Releases/ })).toHaveAttribute(
      'href',
      site.links.releases,
    );
    // Documentation now lives on the site itself.
    expect(screen.getByRole('link', { name: 'Documentation' })).toHaveAttribute('href', '/docs');
  });

  it('shows the current year in the copyright notice', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()}`))).toBeInTheDocument();
  });

  it('logs outbound link clicks', () => {
    const { capture, restore } = captureLogs();
    renderWithRouter(<Footer />);
    screen.getByRole('link', { name: 'Source code' }).click();
    expect(
      capture.records.some(
        (record) =>
          record.message === 'outbound-click' &&
          JSON.stringify(record.data) === JSON.stringify({ target: 'footer-source' }),
      ),
    ).toBe(true);
    restore();
  });

  it('logs a distinct target for every outbound footer link', () => {
    const { capture, restore } = captureLogs();
    renderWithRouter(<Footer />);
    // Each entry pairs an accessible link name with the target suffix
    // its click handler is expected to report.
    const links: ReadonlyArray<[RegExp | string, string]> = [
      ['GitHub', 'footer-github'],
      [/Releases/, 'footer-releases'],
      ['Documentation', 'footer-docs'],
    ];
    for (const [name, target] of links) {
      screen.getByRole('link', { name }).click();
      expect(capture.records).toContainEqual(
        expect.objectContaining({ message: 'outbound-click', data: { target } }),
      );
    }
    restore();
  });
});
