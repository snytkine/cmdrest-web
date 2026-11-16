/**
 * Tests for the theme hook: initial value, toggling, persistence and
 * resilience to unavailable storage.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { THEME_STORAGE_KEY, useTheme } from './useTheme';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete document.documentElement.dataset.theme;
});

describe('useTheme', () => {
  it('defaults to light', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('starts from the theme index.html applied before first paint', () => {
    document.documentElement.dataset.theme = 'dark';
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('toggles, updates the document and remembers the choice', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('still toggles when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('dark');
  });
});
