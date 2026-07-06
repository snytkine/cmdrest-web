/**
 * Tests for the navigation bar: link rendering, active state, the mobile
 * hamburger menu behavior and interaction logging.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavBar } from './NavBar';
import { navItems, site } from '../content/site';
import { renderWithRouter, captureLogs } from '../test/helpers';

/** Restore function of the log capture installed per-test. */
let restoreLogs: (() => void) | undefined;

afterEach(() => {
  restoreLogs?.();
  restoreLogs = undefined;
});

describe('NavBar', () => {
  it('renders a link for every navigation item', () => {
    renderWithRouter(<NavBar />);
    for (const item of navItems) {
      expect(screen.getByRole('link', { name: item.label })).toBeInTheDocument();
    }
  });

  it('links the GitHub button to the source repository', () => {
    renderWithRouter(<NavBar />);
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      site.links.sourceCode,
    );
  });

  it('marks the current page link as active', () => {
    renderWithRouter(<NavBar />, '/features');
    // Only the Features link carries the active modifier class.
    expect(screen.getByRole('link', { name: 'Features' }).className).toContain(
      'navbar__link--active',
    );
    expect(screen.getByRole('link', { name: 'Home' }).className).not.toContain(
      'navbar__link--active',
    );
  });

  it('toggles the mobile menu open and closed', async () => {
    const user = userEvent.setup();
    renderWithRouter(<NavBar />);
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // Opening the menu flips the aria state and the label.
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Close menu');

    // Clicking again closes it.
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the mobile menu when a navigation link is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<NavBar />);
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // Navigating should collapse the dropdown.
    await user.click(screen.getByRole('link', { name: 'Features' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('logs menu toggles and navigation clicks', async () => {
    const { capture, restore } = captureLogs();
    restoreLogs = restore;
    const user = userEvent.setup();
    renderWithRouter(<NavBar />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(screen.getByRole('link', { name: 'Download' }));

    const messages = capture.records.map((record) => record.message);
    expect(messages).toContain('nav-menu-toggle');
    expect(messages).toContain('nav-link-click');
  });

  it('logs clicks on the brand link and the GitHub button', async () => {
    const { capture, restore } = captureLogs();
    restoreLogs = restore;
    const user = userEvent.setup();
    renderWithRouter(<NavBar />);

    // The brand link routes home and is logged like any nav link.
    await user.click(screen.getByRole('link', { name: new RegExp(site.name) }));
    expect(capture.records).toContainEqual(
      expect.objectContaining({ message: 'nav-link-click', data: { label: 'brand' } }),
    );

    // The GitHub button is an outbound link with its own event name.
    await user.click(screen.getByRole('link', { name: 'GitHub' }));
    expect(capture.records).toContainEqual(
      expect.objectContaining({ message: 'outbound-click', data: { target: 'github-navbar' } }),
    );
  });
});
