import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      provider: 'v8',
      reporter: ['text'],
      // thresholds: {
      //   lines: 90,
      //   functions: 90,
      //   branches: 90,
      //   statements: 90,
      // },
    },
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
