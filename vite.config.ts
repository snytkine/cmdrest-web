/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration for the CmdRest promotional website.
 *
 * - `react()` enables the React fast-refresh plugin and JSX transform.
 * - The `test` block configures Vitest (unit test runner):
 *   - `environment: 'jsdom'` simulates a browser DOM so React components
 *     can be rendered and asserted against in tests.
 *   - `setupFiles` runs global test setup (jest-dom matchers, mocks).
 *   - `coverage` uses the V8 provider and only measures `src/` files,
 *     excluding type-only files and the app entry point (bootstrap code
 *     that cannot be meaningfully unit tested).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Type declaration and pure-type files contain no runtime code.
        'src/**/*.d.ts',
        // The entry point only mounts the React tree; it is exercised
        // implicitly by every component test.
        'src/main.tsx',
        // Test helpers are not production code.
        'src/test/**',
      ],
    },
  },
});
