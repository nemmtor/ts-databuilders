import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { Process } from '../process';
import { FileTreeWalker } from './file-tree-walker';
import { Glob } from './glob';

const emptyAsyncGenerator = async function* () {};
const iterateMock = vi.fn(() => Effect.succeed(emptyAsyncGenerator()));

const TestLayer = FileTreeWalker.DefaultWithoutDependencies.pipe(
  Layer.provide(
    Layer.succeed(Process, Process.make({ cwd: Effect.succeed('cwd') })),
  ),
  Layer.provide(Layer.succeed(Glob, Glob.make({ iterate: iterateMock }))),
);

describe('FileTreeWalker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TestLayer)((it) => {
    it.todo('should return stream of files');
    it.todo('should return empty stream if there are no files');

    it.effect('should walk through files in given path', () =>
      Effect.gen(function* () {
        const fileTreeWalker = yield* FileTreeWalker;

        yield* fileTreeWalker.walk('path').pipe(Stream.runCollect);

        expect(iterateMock).toHaveBeenCalledWith({ path: 'path', cwd: 'cwd' });
      }),
    );

    it.effect(
      'should fail with FileTreeWalkerError if glob file search fails',
      () =>
        Effect.gen(function* () {
          iterateMock.mockImplementationOnce(() =>
            Effect.succeed(
              // biome-ignore lint/correctness/useYield: yield is not there because this just throws
              (async function* () {
                throw new Error('foo');
              })(),
            ),
          );
          const fileTreeWalker = yield* FileTreeWalker;

          const exit = yield* fileTreeWalker
            .walk('path')
            .pipe(Effect.flatMap(Stream.runCollect), Effect.exit);

          expect(
            Exit.isFailure(exit) &&
              Cause.isFailType(exit.cause) &&
              exit.cause.error,
          ).toEqual(expect.objectContaining({ _tag: 'FileTreeWalkError' }));
        }),
    );
  });
});
