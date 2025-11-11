import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Effect from 'effect/Effect';

import * as ASTParserError from './ast-parser.errors';
import * as ts from './typescript';
import * as SourceFileVisitor from './visitors/source-file-visitor.service';

export class ASTParser extends Effect.Service<ASTParser>()(
  '@TSDataBuilders/ASTParser',
  {
    effect: Effect.gen(function* () {
      yield* Effect.logDebug('Instantiating ASTParser service');

      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const sourceFileVisitor = yield* SourceFileVisitor.SourceFileVisitor;

      const getSourceFile = Effect.fnUntraced(function* (filePath: string) {
        const fileContent = yield* fs.readFileString(filePath, 'utf-8');

        return yield* Effect.try({
          try: () =>
            ts.createSourceFile(
              path.basename(filePath),
              fileContent,
              ts.ScriptTarget.Latest, // TODO: Make an option for it and fallback to tsconfig.json value OR default value
              true,
            ),
          catch: (cause) =>
            new ASTParserError.CreateTSSourceFileError({ cause }),
        });
      });

      return {
        parse: Effect.fnUntraced(function* (filePath: string) {
          yield* Effect.logDebug(`Parsing ${filePath}`);

          const sourceFile = yield* getSourceFile(filePath);
          yield* sourceFileVisitor.visit(sourceFile);
        }),
      };
    }),
    dependencies: [SourceFileVisitor.SourceFileVisitor.Default],
  },
) {}
