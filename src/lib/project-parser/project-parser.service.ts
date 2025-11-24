import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';

import * as TypescriptProgram from '../typescript-program';
import type * as ParserType from './parser.type';
import * as SourceFileParser from './source-file-parser.service';

export class ProjectParser extends Effect.Service<ProjectParser>()(
  '@TSDataBuilders/ProjectParser',
  {
    effect: Effect.gen(function* () {
      const typescriptUtils = yield* TypescriptProgram.TypescriptProgram;
      const sourceFileParser = yield* SourceFileParser.SourceFileParser;

      return {
        parseFiles: Effect.fnUntraced(function* (
          filePaths: Chunk.Chunk<string>,
        ) {
          const result: ParserType.ParsedFile[] = yield* Effect.all(
            filePaths.pipe(
              Chunk.map((filePath) =>
                typescriptUtils
                  .getSourceFile(filePath)
                  .pipe(
                    Effect.flatMap((sourceFile) =>
                      sourceFileParser.parse(sourceFile),
                    ),
                  ),
              ),
            ),
            { concurrency: 'unbounded' },
          );

          return result;
        }),
      };
    }),
    dependencies: [
      TypescriptProgram.TypescriptProgram.Default,
      SourceFileParser.SourceFileParser.Default,
    ],
  },
) {}
