import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.js', 'src/**/*.test.js'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
