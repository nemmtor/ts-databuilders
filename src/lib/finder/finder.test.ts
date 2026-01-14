import { Chunk, Stream } from 'effect';

import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { FileContentChecker } from './file-content-checker';
import { FileTreeWalkError, FileTreeWalker } from './file-tree-walker';
import { Finder } from './finder';

const fileTreeWalkerWalkMock = vi.fn(
  (): Effect.Effect<
    Stream.Stream<string, FileTreeWalkError, never>,
    never,
    never
  > => Effect.succeed(Stream.fromIterable<string>([])),
);
const fileContentCheckerCheckMock = vi.fn(() =>
  Effect.succeed(Option.some<true>(true)),
);

const TestLayer = Finder.DefaultWithoutDependencies.pipe(
  Layer.provide(
    Layer.succeed(
      FileTreeWalker,
      FileTreeWalker.make({ walk: fileTreeWalkerWalkMock }),
    ),
  ),
  Layer.provide(
    Layer.succeed(
      FileContentChecker,
      FileContentChecker.make({ check: fileContentCheckerCheckMock }),
    ),
  ),
);

describe('Finder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TestLayer)((it) => {
    it.effect(
      'should return list of files with data builders',
      Effect.fnUntraced(function* () {
        fileTreeWalkerWalkMock.mockReturnValueOnce(
          Effect.succeed(
            Stream.fromIterable<string>(['file1', 'file2', 'file3']),
          ),
        );
        fileContentCheckerCheckMock
          .mockReturnValueOnce(Effect.succeed(Option.some<true>(true)))
          .mockReturnValueOnce(Effect.succeed(Option.none<true>()))
          .mockReturnValueOnce(Effect.succeed(Option.some<true>(true)));
        const finder = yield* Finder;

        const foundFiles = yield* finder.find({ pattern: '', include: '' });

        expect(foundFiles).toEqual(Chunk.fromIterable(['file1', 'file3']));
      }),
    );

    it.effect(
      'should return empty list if there are no files with data builders',
      Effect.fnUntraced(function* () {
        fileTreeWalkerWalkMock.mockReturnValueOnce(
          Effect.succeed(
            Stream.fromIterable<string>(['file1', 'file2', 'file3']),
          ),
        );
        fileContentCheckerCheckMock
          .mockReturnValueOnce(Effect.succeed(Option.none<true>()))
          .mockReturnValueOnce(Effect.succeed(Option.none<true>()))
          .mockReturnValueOnce(Effect.succeed(Option.none<true>()));
        const finder = yield* Finder;

        const foundFiles = yield* finder.find({ pattern: '', include: '' });

        expect(foundFiles).toEqual(Chunk.fromIterable([]));
      }),
    );

    it.effect(
      'should return empty list if there are no files at all',
      Effect.fnUntraced(function* () {
        fileTreeWalkerWalkMock.mockReturnValueOnce(
          Effect.succeed(Stream.fromIterable<string>([])),
        );
        const finder = yield* Finder;

        const foundFiles = yield* finder.find({ pattern: '', include: '' });

        expect(foundFiles).toEqual(Chunk.fromIterable([]));
      }),
    );

    it.effect(
      'should die with treewalker error',
      Effect.fnUntraced(function* () {
        fileTreeWalkerWalkMock.mockReturnValueOnce(
          Effect.succeed(
            Stream.fail(new FileTreeWalkError({ cause: 'cause' })),
          ),
        );
        const finder = yield* Finder;

        const result = yield* finder
          .find({ pattern: '', include: '' })
          .pipe(Effect.catchAllDefect((v) => Effect.succeed(v)));

        expect(result).toBeInstanceOf(FileTreeWalkError);
      }),
    );
  });
});
