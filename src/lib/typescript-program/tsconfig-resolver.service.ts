import * as Path from '@effect/platform/Path';
import * as Effect from 'effect/Effect';

import * as Configuration from '../../cli/configuration';
import * as Process from '../process';
import * as ts from '../typescript';
import * as TypescriptError from './typescript.errors';

export class TSConfigResolver extends Effect.Service<TSConfigResolver>()(
  '@TSDataBuilders/TSConfigResolver',
  {
    effect: Effect.gen(function* () {
      const path = yield* Path.Path;
      const process = yield* Process.Process;
      const cwd = yield* process.cwd;
      const { tsconfig } = yield* Configuration.Configuration;

      return {
        resolve: Effect.gen(function* () {
          const configFilePath = yield* Effect.try({
            try: () => ts.findConfigFile(cwd, ts.sys.fileExists, tsconfig),
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
        }),
      };
    }),
  },
) {}
