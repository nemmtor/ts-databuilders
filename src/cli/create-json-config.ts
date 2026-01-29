import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Process from '../lib/process';
import * as utils from '../lib/utils';
import * as Configuration from './configuration';

export const program = Effect.fnUntraced(function* (
  opts: Configuration.CliConfigurationShape,
) {
  const process = yield* Process.Process;
  const fs = yield* FileSystem.FileSystem;
  const cwd = yield* process.cwd;
  const path = yield* Path.Path;
  const configPath = path.join(cwd, Configuration.CONFIG_FILE_NAME);

  const defaultsFromCLI = utils.removeUndefinedFields({
    string: opts.defaultString.pipe(Option.getOrUndefined),
    number: opts.defaultNumber.pipe(Option.getOrUndefined),
    boolean: opts.defaultBoolean.pipe(Option.getOrUndefined),
  });

  const configurationFileContent = yield* Schema.decode(
    Configuration.ConfigurationFileSchema,
  )({
    $schema:
      'https://raw.githubusercontent.com/nemmtor/ts-databuilders/refs/heads/main/schema.json',
    builderSuffix: opts.builderSuffix.pipe(
      Option.getOrElse(() => Configuration.DEFAULT_CONFIGURATION.builderSuffix),
    ),
    fileSuffix: opts.fileSuffix.pipe(
      Option.getOrElse(() => Configuration.DEFAULT_CONFIGURATION.fileSuffix),
    ),
    fileCase: opts.fileCase.pipe(
      Option.getOrElse(() => Configuration.DEFAULT_CONFIGURATION.fileCase),
    ),
    include: opts.include.pipe(
      Option.getOrElse(() => Configuration.DEFAULT_CONFIGURATION.include),
    ),
    builderJsDocTagName: opts.builderJsDocTagName.pipe(
      Option.getOrElse(
        () => Configuration.DEFAULT_CONFIGURATION.builderJsDocTagName,
      ),
    ),
    inlineDefaultJsDocTagName: opts.inlineDefaultJsDocTagName.pipe(
      Option.getOrElse(
        () => Configuration.DEFAULT_CONFIGURATION.inlineDefaultJsDocTagName,
      ),
    ),
    withNestedBuilders: opts.withNestedBuilders.pipe(
      Option.getOrElse(
        () => Configuration.DEFAULT_CONFIGURATION.withNestedBuilders,
      ),
    ),
    outputDir: opts.outputDir.pipe(
      Option.getOrElse(() => Configuration.DEFAULT_CONFIGURATION.outputDir),
    ),
    tsconfig: opts.tsconfig.pipe(
      Option.getOrElse(() => Configuration.DEFAULT_CONFIGURATION.tsconfig),
    ),
    defaults: {
      ...Configuration.DEFAULT_CONFIGURATION.defaults,
      ...defaultsFromCLI,
    },
  });

  yield* fs.writeFileString(
    configPath,
    `${yield* Schema.encode(Schema.parseJson({ replacer: null, space: 2 }))(configurationFileContent)}\n`,
  );
});
