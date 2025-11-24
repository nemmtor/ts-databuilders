import * as FileSystem from '@effect/platform/FileSystem';
import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { FileContentChecker } from './file-content-checker';

const fsStreamMock = vi.fn(() => Stream.fromIterable<Uint8Array>([]));
const encoder = new TextEncoder();

const TestLayer = FileContentChecker.Default.pipe(
  Layer.provide(
    FileSystem.layerNoop({
      stream: fsStreamMock,
    }),
  ),
);

describe('FileContentChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TestLayer)((it) => {
    it.effect('should return information that file contains content', () =>
      Effect.gen(function* () {
        fsStreamMock.mockReturnValue(
          Stream.fromIterable([encoder.encode('hello foo world')]),
        );
        const fileContentChecker = yield* FileContentChecker;

        const result = yield* fileContentChecker.check({
          filePath: 'test',
          content: 'foo',
        });

        expect(Option.isSome(result)).toBe(true);
      }),
    );

    it.effect(
      'should return information that file contains content even if it is in later chunk',
      () =>
        Effect.gen(function* () {
          fsStreamMock.mockReturnValue(
            Stream.fromIterable([
              encoder.encode('hello '),
              encoder.encode('foo '),
              encoder.encode('world'),
            ]),
          );

          const fileContentChecker = yield* FileContentChecker;
          const result = yield* fileContentChecker.check({
            filePath: 'test',
            content: 'foo',
          });

          expect(Option.isSome(result)).toBe(true);
        }),
    );

    it.effect(
      'should return information that file contains content even if it is split between chunks',
      () =>
        Effect.gen(function* () {
          fsStreamMock.mockReturnValue(
            Stream.fromIterable([
              encoder.encode('hello f'),
              encoder.encode('oo '),
              encoder.encode('world'),
            ]),
          );

          const fileContentChecker = yield* FileContentChecker;
          const result = yield* fileContentChecker.check({
            filePath: 'test',
            content: 'foo',
          });

          expect(Option.isSome(result)).toBe(true);
        }),
    );

    it('should return information that file doesnt contain content', () =>
      Effect.gen(function* () {
        const fileContent = 'hello world';
        fsStreamMock.mockReturnValue(
          Stream.fromIterable([encoder.encode(fileContent)]),
        );
        const fileContentChecker = yield* FileContentChecker;

        const result = yield* fileContentChecker.check({
          filePath: 'test',
          content: 'foo',
        });

        expect(Option.isNone(result)).toBe(true);
      }));
  });
});
