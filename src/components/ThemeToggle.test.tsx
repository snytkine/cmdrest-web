/**
 * Tests for the theme switch: its accessible state in each theme and
 * the toggle callback.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('is an unchecked switch in light mode', () => {
    render(<ThemeToggle theme="light" onToggle={vi.fn()} />);
    const toggle = screen.getByRole('switch', { name: 'Dark mode' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveAttribute('title', 'Switch to dark mode');
  });

  it('is a checked switch in dark mode', () => {
    render(<ThemeToggle theme="dark" onToggle={vi.fn()} />);
    const toggle = screen.getByRole('switch', { name: 'Dark mode' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toHaveAttribute('title', 'Switch to light mode');
  });

  it('calls onToggle when clicked', async () => {
    const onToggle = vi.fn();
    render(<ThemeToggle theme="light" onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
