import { type PlatformError, SystemError } from '@effect/platform/Error';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CreateTSSourceFileError } from './ast-parser.errors';
import { ASTParser } from './ast-parser.service';
import * as ts from './typescript';
import { SourceFileVisitor } from './visitors/source-file-visitor.service';

const fsReadFileStringMock = vi.fn<
  () => Effect.Effect<string, PlatformError, never>
>(() => Effect.succeed(''));

const sourceFileVisitMock = vi.fn(() => Effect.succeed([]));

const TestLayer = ASTParser.DefaultWithoutDependencies.pipe(
  Layer.provide([
    Layer.succeed(
      SourceFileVisitor,
      SourceFileVisitor.make({ visit: sourceFileVisitMock }),
    ),
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
      }),
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
      }),
    );

    it.effect(
      'should delegate work to source file visitor',
      Effect.fnUntraced(function* () {
        const sourceFile = getSourceFile();
        vi.spyOn(ts, 'createSourceFile');
        const astParser = yield* ASTParser;

        yield* astParser.parse('a.ts');

        expect(sourceFileVisitMock).toHaveBeenCalledExactlyOnceWith(sourceFile);
      }),
    );
  });
});

function getSourceFile(): ts.SourceFile {
  return ts.createSourceFile('a.ts', '', ts.ScriptTarget.Latest, true);
}
