/**
 * Tests for the decorative navbar icons.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { GlassIcon } from './GlassIcon';
import { navItems } from '../content/site';

describe('GlassIcon', () => {
  it.each(navItems.map((item) => item.icon))('renders a decorative "%s" icon', (name) => {
    const { container } = render(<GlassIcon name={name} />);
    const icon = container.firstElementChild;
    expect(icon).toHaveClass('glass-icon', `glass-icon--${name}`);
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon?.querySelector('svg')?.childElementCount).toBeGreaterThan(0);
  });
});
