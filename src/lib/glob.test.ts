import { glob } from 'glob';

import { describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Glob } from './glob';

const emptyAsyncGenerator = async function* () {};

const TestLayer = Glob.Default;

describe('Glob', () => {
  it.layer(TestLayer)((it) => {
    it.effect(
      'should iterate on provided path and cwd, skipping directories',
      () =>
        Effect.gen(function* () {
          const iterateSpy = vi
            .spyOn(glob, 'iterate')
            .mockImplementationOnce(emptyAsyncGenerator);
          const globService = yield* Glob;

          yield* globService.iterate({ path: 'path', cwd: 'cwd' });

          expect(iterateSpy).toHaveBeenCalledWith('path', {
            cwd: 'cwd',
            nodir: true,
          });
        }),
    );

    it.effect('should return found files', () =>
      Effect.gen(function* () {
        vi.spyOn(glob, 'iterate').mockImplementationOnce(async function* () {
          yield 'file1.ts';
          yield 'file2.ts';
        });
        const globService = yield* Glob;

        const result = yield* globService.iterate({ path: 'path', cwd: 'cwd' });
        yield* Effect.promise(async () => {
          const files = [];
          for await (const file of result) {
            files.push(file);
          }

          expect(files).toEqual(['file1.ts', 'file2.ts']);
        });
      }),
    );
  });
});
