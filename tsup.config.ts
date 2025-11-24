import { defineConfig } from 'tsup';
import { cp } from 'node:fs/promises';

export default defineConfig({
  entry: ['src/main.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node22',
  clean: true,
  minify: true,
  external: [
    'effect',
    '@effect/cli',
    '@effect/platform',
    '@effect/platform-node',
    'glob',
    'ts-morph',
    'typescript',
  ],
  banner: {
    js: '#!/usr/bin/env node',
  },
  onSuccess: async () => {
    await cp('src/builder-generator/templates', 'dist/templates', {
      recursive: true,
    });
  },
});
