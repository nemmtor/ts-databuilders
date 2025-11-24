import * as Path from '@effect/platform/Path';
import * as Effect from 'effect/Effect';

import * as ts from './typescript';
import * as TypescriptError from './typescript.errors';

export class TypescriptUtils extends Effect.Service<TypescriptUtils>()(
  '@TSDataBuilders/TypescriptUtils',
  {
    effect: Effect.gen(function* () {
      const path = yield* Path.Path;

      const getTsConfig = Effect.fnUntraced(function* (filePath: string) {
        const configFilePath = yield* Effect.try({
          try: () =>
            ts.findConfigFile(
              path.dirname(filePath),
              ts.sys.fileExists,
              'tsconfig.json',
            ),
          catch: (cause) => new TypescriptError.GetTSConfigError({ cause }),
        });

        if (!configFilePath) {
          return yield* new TypescriptError.TSConfigNotFoundError();
        }

        const config = yield* Effect.try({
          try: () => {
            const { config, error } = ts.readConfigFile(
              configFilePath,
              ts.sys.readFile,
            );

            if (error) {
              throw error;
            }

            return config;
          },
          catch: (cause) => new TypescriptError.GetTSConfigError({ cause }),
        });

        return yield* Effect.try({
          try: () =>
            ts.parseJsonConfigFileContent(
              config,
              ts.sys,
              path.dirname(configFilePath),
            ),
          catch: (cause) => new TypescriptError.GetTSConfigError({ cause }),
        });
      });

      const createProject = Effect.fnUntraced(function* (filePath: string) {
        const absolutePath = path.resolve(filePath);
        const config = yield* getTsConfig(absolutePath);
        const program = yield* Effect.try({
          try: () => ts.createProgram(config.fileNames, config.options),
          catch: (cause) => new TypescriptError.CreateProjectError({ cause }),
        });

        const typeChecker = yield* Effect.try({
          try: () => program.getTypeChecker(),
          catch: (cause) => new TypescriptError.CreateProjectError({ cause }),
        });

        const sourceFile = yield* Effect.try({
          try: () => program.getSourceFile(absolutePath),
          catch: (cause) => new TypescriptError.CreateProjectError({ cause }),
        });

        if (!sourceFile) {
          return yield* new TypescriptError.SourceFileNotFoundError();
        }

        return {
          typeChecker,
          sourceFile,
        };
      });

      return {
        createProject,
        getTsConfig,
      };
    }),
  },
) {}
