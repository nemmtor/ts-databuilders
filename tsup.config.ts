import { defineConfig } from 'tsup';

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
});
