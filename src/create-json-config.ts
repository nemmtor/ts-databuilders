import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import {
  type CliConfigurationShape,
  CONFIG_FILE_NAME,
  ConfigurationFileSchema,
  DEFAULT_CONFIGURATION,
} from './configuration';
import * as Process from './process';
import { removeUndefinedFields } from './utils/remove-undefined-fields';

export const createJsonConfig = (opts: CliConfigurationShape) =>
  Effect.gen(function* () {
    const process = yield* Process.Process;
    const fs = yield* FileSystem.FileSystem;
    const cwd = yield* process.cwd;
    const path = yield* Path.Path;
    const configPath = path.join(cwd, CONFIG_FILE_NAME);

    const defaultsFromCLI = removeUndefinedFields({
      string: opts.defaultString.pipe(Option.getOrUndefined),
      number: opts.defaultNumber.pipe(Option.getOrUndefined),
      boolean: opts.defaultBoolean.pipe(Option.getOrUndefined),
    });

    const configurationFileContent = yield* Schema.decode(
      ConfigurationFileSchema,
    )({
      $schema:
        'https://raw.githubusercontent.com/nemmtor/ts-databuilders/refs/heads/main/schema.json',
      builderSuffix: opts.builderSuffix.pipe(
        Option.getOrElse(() => DEFAULT_CONFIGURATION.builderSuffix),
      ),
      fileSuffix: opts.fileSuffix.pipe(
        Option.getOrElse(() => DEFAULT_CONFIGURATION.fileSuffix),
      ),
      include: opts.include.pipe(
        Option.getOrElse(() => DEFAULT_CONFIGURATION.include),
      ),
      jsdocTag: opts.jsdocTag.pipe(
        Option.getOrElse(() => DEFAULT_CONFIGURATION.jsdocTag),
      ),
      outputDir: opts.outputDir.pipe(
        Option.getOrElse(() => DEFAULT_CONFIGURATION.outputDir),
      ),
      defaults: {
        ...DEFAULT_CONFIGURATION.defaults,
        ...defaultsFromCLI,
      },
    });

    yield* fs.writeFileString(
      configPath,
      JSON.stringify(configurationFileContent, null, 2),
    );
  });
