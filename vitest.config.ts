import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'build/',
        'public/',
      ],
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
    include: ['app/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'build', 'public'],
  },
  resolve: {
    alias: {
      '~': '/app',
    },
  },
});
