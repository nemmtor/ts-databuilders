import { type PlatformError, SystemError } from '@effect/platform/Error';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as ts from '../typescript/typescript';
import { CreateTSSourceFileError } from './ast-parser.errors';
import { ASTParser } from './ast-parser.service';
import {
  createTestVisitorLayer,
  visitSourceFile,
} from './visitors/__test-utils__';
import { VisitorLayer } from './visitors/visitor.layer';

const fsReadFileStringMock = vi.fn<
  () => Effect.Effect<string, PlatformError, never>
>(() => Effect.succeed(''));

const visitSourceFileMock = vi.fn(() => visitSourceFile);

const TestLayer = ASTParser.Default.pipe(
  Layer.provide([
    FileSystem.layerNoop({
      readFileString: fsReadFileStringMock,
    }),
    Path.layer,
  ]),
);

describe('ASTParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TestLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const astParser = yield* ASTParser;

        expect(astParser).toBeDefined();
      }),
    );

    it.effect(
      'should fail with CreateTSSourceFileError if ts.createSourceFile fails',
      Effect.fnUntraced(function* () {
        const error = new Error('error');
        vi.spyOn(ts, 'createSourceFile').mockImplementationOnce(() => {
          throw error;
        });
        const astParser = yield* ASTParser;

        const result = yield* astParser.parse('a.ts').pipe(Effect.flip);

        expect(result).toBeInstanceOf(CreateTSSourceFileError);
        expect(result.cause).toBe(error);
      }, Effect.provide(createTestVisitorLayer())),
    );

    it.effect(
      'should fail with file read error if it fails',
      Effect.fnUntraced(function* () {
        const error = SystemError.make({
          method: '',
          module: 'FileSystem',
          reason: 'Unknown',
        });
        fsReadFileStringMock.mockReturnValueOnce(Effect.fail(error));
        const astParser = yield* ASTParser;

        const result = yield* astParser.parse('a.ts').pipe(Effect.flip);

        expect(result).toBe(error);
      }, Effect.provide(createTestVisitorLayer())),
    );

    it.effect(
      'should delegate source file to its own visitor',
      Effect.fnUntraced(
        function* () {
          const sourceFile = getSourceFile();
          vi.spyOn(ts, 'createSourceFile');
          const astParser = yield* ASTParser;

          yield* astParser.parse('a.ts');

          expect(visitSourceFileMock).toHaveBeenCalledExactlyOnceWith(
            sourceFile,
          );
        },
        Effect.provide(
          createTestVisitorLayer({ visitSourceFile: visitSourceFileMock }),
        ),
      ),
    );

    it.effect(
      'scratchpad',
      Effect.fnUntraced(function* () {
        vi.spyOn(ts, 'createSourceFile').mockReturnValueOnce(
          ts.createSourceFile(
            'a.ts',
            `
            /** @Foo */
            type Foo = {
              /** @string */
              string: string;
              /** @number */
              number: number;
              /** @boolean */
              boolean: boolean;
              /** @bigint */
              bigint: bigint;
              /** @never */
              never: never;
              /** @undefined */
              undefined: undefined;
              /** @symbol */
              symbol: symbol;
              /** @any */
              any: any;
              /** @unknown */
              unknown: unknown;
            }`,
            ts.ScriptTarget.Latest,
            true,
          ),
        );
        const astParser = yield* ASTParser;
        yield* astParser.parse('a.ts');
        // const result = yield* astParser.parse('a.ts');
        // console.log(JSON.stringify(result, null, 4));
      }, Effect.provide(VisitorLayer)),
    );

    it.effect(
      'scratchpad2',
      Effect.fnUntraced(function* () {
        vi.spyOn(ts, 'createSourceFile').mockReturnValueOnce(
          ts.createSourceFile(
            'a.ts',
            `
            type Foo = {
              foo: {
                bar: string;
              };
            }`,
            ts.ScriptTarget.Latest,
            true,
          ),
        );
        const astParser = yield* ASTParser;
        yield* astParser.parse('a.ts');
        // console.log(JSON.stringify(yield* astParser.parse('a.ts'), null, 4));
      }, Effect.provide(VisitorLayer)),
    );
  });
});

function getSourceFile(): ts.SourceFile {
  return ts.createSourceFile('a.ts', '', ts.ScriptTarget.Latest, true);
}
