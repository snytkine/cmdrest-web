/**
 * Global Vitest setup, executed once before every test file.
 *
 * - Registers the jest-dom matchers (`toBeInTheDocument`, ...).
 * - Installs `fake-indexeddb` so the IndexedDB transport can be tested
 *   against a real (in-memory) IndexedDB implementation, which jsdom
 *   does not provide.
 * - Stubs `window.scrollTo`, which jsdom declares but does not implement
 *   (the Layout component calls it on every route change).
 */
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// jsdom throws "Not implemented" for scrollTo; a spy keeps route-change
// scrolling testable and silent.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
