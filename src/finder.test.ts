import { Chunk, Exit, Stream } from 'effect';

import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { Configuration, DEFAULT_CONFIGURATION } from './configuration';
import { Finder } from './finder';
import { FileContentChecker } from './lib/file-content-checker';
import { TreeWalker, TreeWalkerError } from './lib/tree-walker';

const treeWalkerWalkMock = vi.fn(
  (): Effect.Effect<
    Stream.Stream<string, TreeWalkerError, never>,
    never,
    never
  > => Effect.succeed(Stream.fromIterable<string>([])),
);
const fileContentCheckerCheckMock = vi.fn(() =>
  Effect.succeed(Option.some<true>(true)),
);

const TestLayer = Finder.DefaultWithoutDependencies.pipe(
  Layer.provide(
    Layer.succeed(TreeWalker, TreeWalker.make({ walk: treeWalkerWalkMock })),
  ),
  Layer.provide(
    Layer.succeed(
      FileContentChecker,
      FileContentChecker.make({ check: fileContentCheckerCheckMock }),
    ),
  ),
  Layer.provide(
    Layer.succeed(Configuration, Configuration.of(DEFAULT_CONFIGURATION)),
  ),
);

describe('Finder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TestLayer)((it) => {
    it.effect('should return list of files with data builders', () =>
      Effect.gen(function* () {
        treeWalkerWalkMock.mockReturnValueOnce(
          Effect.succeed(
            Stream.fromIterable<string>(['file1', 'file2', 'file3']),
          ),
        );
        fileContentCheckerCheckMock
          .mockReturnValueOnce(Effect.succeed(Option.some<true>(true)))
          .mockReturnValueOnce(Effect.succeed(Option.none<true>()))
          .mockReturnValueOnce(Effect.succeed(Option.some<true>(true)));
        const finder = yield* Finder;

        const foundFiles = yield* finder.find;

        expect(foundFiles).toEqual(Chunk.fromIterable(['file1', 'file3']));
      }),
    );

    it.effect(
      'should return empty list if there are no files with data builders',
      () =>
        Effect.gen(function* () {
          treeWalkerWalkMock.mockReturnValueOnce(
            Effect.succeed(
              Stream.fromIterable<string>(['file1', 'file2', 'file3']),
            ),
          );
          fileContentCheckerCheckMock
            .mockReturnValueOnce(Effect.succeed(Option.none<true>()))
            .mockReturnValueOnce(Effect.succeed(Option.none<true>()))
            .mockReturnValueOnce(Effect.succeed(Option.none<true>()));
          const finder = yield* Finder;

          const foundFiles = yield* finder.find;

          expect(foundFiles).toEqual(Chunk.fromIterable([]));
        }),
    );

    it.effect('should return empty list if there are no files at all', () =>
      Effect.gen(function* () {
        treeWalkerWalkMock.mockReturnValueOnce(
          Effect.succeed(Stream.fromIterable<string>([])),
        );
        const finder = yield* Finder;

        const foundFiles = yield* finder.find;

        expect(foundFiles).toEqual(Chunk.fromIterable([]));
      }),
    );

    it.effect('should die with treewalker error', () =>
      Effect.gen(function* () {
        treeWalkerWalkMock.mockReturnValueOnce(
          Effect.succeed(Stream.fail(new TreeWalkerError({ cause: 'cause' }))),
        );
        const finder = yield* Finder;

        const result = yield* finder.find.pipe(
          Effect.catchAllDefect((v) => Effect.succeed(v)),
        );

        expect(result).toBeInstanceOf(TreeWalkerError);
      }),
    );
  });
});
