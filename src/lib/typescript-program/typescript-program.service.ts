import * as Path from '@effect/platform/Path';
import * as Effect from 'effect/Effect';

import * as ts from '../typescript';
import * as TSConfigResolver from './tsconfig-resolver.service';
import * as TypescriptError from './typescript.errors';

export class TypescriptProgram extends Effect.Service<TypescriptProgram>()(
  '@TSDataBuilders/TypescriptProgram',
  {
    effect: Effect.gen(function* () {
      const path = yield* Path.Path;
      const tsConfigResolver = yield* TSConfigResolver.TSConfigResolver;
      const config = yield* tsConfigResolver.resolve;

      const program = yield* Effect.try({
        try: () => ts.createProgram(config.fileNames, config.options),
        catch: (cause) => new TypescriptError.CreateProgramError({ cause }),
      });

      const typeChecker = yield* Effect.try({
        try: () => program.getTypeChecker(),
        catch: (cause) => new TypescriptError.GetTypeCheckerError({ cause }),
      });

      const getSourceFile = Effect.fnUntraced(function* (filePath: string) {
        const absolutePath = path.resolve(filePath);
        const sourceFile = yield* Effect.try({
          try: () => program.getSourceFile(absolutePath),
          catch: (cause) => new TypescriptError.GetSourceFileError({ cause }),
        });

        if (!sourceFile) {
          return yield* new TypescriptError.SourceFileNotFoundError();
        }

        return sourceFile;
      });

      const createSourceFile = (opts: {
        fileName: string;
        sourceText: string;
      }) =>
        Effect.try({
          try: () =>
            ts.createSourceFile(
              opts.fileName,
              opts.sourceText,
              config.options.target ?? ts.ScriptTarget.Latest,
            ),
          catch: (cause) =>
            new TypescriptError.CreateSourceFileError({ cause }),
        });

      return {
        program,
        typeChecker,
        getSourceFile,
        createSourceFile,
      };
    }),
    dependencies: [TSConfigResolver.TSConfigResolver.Default],
  },
) {}
