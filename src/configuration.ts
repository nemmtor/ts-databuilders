import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { DESCRIPTIONS } from './descriptions';
import * as Process from './process';
import { removeUndefinedFields } from './utils/remove-undefined-fields';

export const CONFIG_FILE_NAME = 'ts-databuilders.json';

const ConfigurationSchema = Schema.Struct({
  jsdocTag: Schema.NonEmptyTrimmedString,
  outputDir: Schema.NonEmptyTrimmedString,
  include: Schema.NonEmptyTrimmedString,
  fileSuffix: Schema.NonEmptyTrimmedString,
  builderSuffix: Schema.NonEmptyTrimmedString,
  defaults: Schema.Struct({
    string: Schema.String,
    number: Schema.Number,
    boolean: Schema.Boolean,
  }),
});

export const DEFAULT_CONFIGURATION = ConfigurationSchema.make({
  jsdocTag: 'DataBuilder',
  outputDir: 'generated/builders',
  include: 'src/**/*.ts{,x}',
  fileSuffix: '.builder',
  builderSuffix: 'Builder',
  defaults: {
    string: '',
    number: 0,
    boolean: false,
  },
});
type ConfigurationShape = typeof ConfigurationSchema.Type;

export const ConfigurationFileSchema = Schema.Struct({
  $schema: Schema.optional(Schema.String),
  jsdocTag: Schema.String.pipe(
    Schema.annotations({ description: DESCRIPTIONS.jsdocTag }),
  ),
  outputDir: Schema.String.pipe(
    Schema.annotations({ description: DESCRIPTIONS.outputDir }),
  ),
  include: Schema.String.pipe(
    Schema.annotations({ description: DESCRIPTIONS.include }),
  ),
  fileSuffix: Schema.String.pipe(
    Schema.annotations({ description: DESCRIPTIONS.fileSuffix }),
  ),
  builderSuffix: Schema.String.pipe(
    Schema.annotations({ description: DESCRIPTIONS.builderSuffix }),
  ),
  defaults: Schema.Struct({
    string: Schema.String.pipe(
      Schema.annotations({ description: DESCRIPTIONS.defaultString }),
    ),
    number: Schema.Number.pipe(
      Schema.annotations({ description: DESCRIPTIONS.defaultNumber }),
    ),
    boolean: Schema.Boolean.pipe(
      Schema.annotations({ description: DESCRIPTIONS.defaultBoolean }),
    ),
  }).pipe(
    Schema.partial,
    Schema.annotations({ description: DESCRIPTIONS.defaults }),
  ),
}).pipe(Schema.partial);

type ConfigurationFileShape = typeof ConfigurationFileSchema.Type;

export class Configuration extends Context.Tag('Configuration')<
  Configuration,
  ConfigurationShape
>() {}

export const CliConfigurationSchema = Schema.Struct({
  jsdocTag: Schema.NonEmptyTrimmedString,
  outputDir: Schema.NonEmptyTrimmedString,
  include: Schema.NonEmptyTrimmedString,
  fileSuffix: Schema.NonEmptyTrimmedString,
  builderSuffix: Schema.NonEmptyTrimmedString,
  defaultString: Schema.String,
  defaultNumber: Schema.NumberFromString,
  defaultBoolean: Schema.BooleanFromString,
});

export type CliConfigurationShape = {
  [key in keyof typeof CliConfigurationSchema.Type]: Option.Option<
    (typeof CliConfigurationSchema.Type)[key]
  >;
};

export const load = (opts: CliConfigurationShape) =>
  Effect.gen(function* () {
    yield* Effect.logDebug('[Configuration]: Loading configuration');
    const process = yield* Process.Process;
    const cwd = yield* process.cwd;
    const path = yield* Path.Path;
    const configPath = path.join(cwd, CONFIG_FILE_NAME);
    const configFileContent = yield* readConfigFileContent(configPath);
    const config = yield* resolveConfig({
      fromCLI: opts,
      fromConfigFile: configFileContent,
    });
    return Configuration.of(config);
  });

const resolveConfig = (opts: {
  fromCLI: CliConfigurationShape;
  fromConfigFile: Option.Option<ConfigurationFileShape>;
}): Effect.Effect<ConfigurationShape> =>
  Effect.gen(function* () {
    const resolve = resolveConfigValue(opts);

    const defaultsFromFile = Option.flatMap(
      opts.fromConfigFile,
      (fileContent) => Option.fromNullable(fileContent.defaults),
    ).pipe(
      Option.map((v) => removeUndefinedFields(v)),
      Option.getOrElse(() => ({})),
    );
    const defaultsFromCLI = removeUndefinedFields({
      string: opts.fromCLI.defaultString.pipe(Option.getOrUndefined),
      number: opts.fromCLI.defaultNumber.pipe(Option.getOrUndefined),
      boolean: opts.fromCLI.defaultBoolean.pipe(Option.getOrUndefined),
    });
    const providedDefaults = {
      ...defaultsFromFile,
      ...defaultsFromCLI,
    };

    const config = {
      builderSuffix: yield* resolve('builderSuffix'),
      include: yield* resolve('include'),
      fileSuffix: yield* resolve('fileSuffix'),
      jsdocTag: yield* resolve('jsdocTag'),
      outputDir: yield* resolve('outputDir'),
      defaults: {
        ...DEFAULT_CONFIGURATION.defaults,
        ...providedDefaults,
      },
    };

    yield* Effect.logDebug(
      `[Configuration]: Resolving config with value: ${JSON.stringify(config, null, 4)}`,
    );
    return config;
  });

const resolveConfigValue =
  (opts: {
    fromCLI: CliConfigurationShape;
    fromConfigFile: Option.Option<ConfigurationFileShape>;
  }) =>
  <K extends keyof ConfigurationShape>(key: K) =>
    opts.fromCLI[key].pipe(
      Effect.orElse(() =>
        Option.flatMap(opts.fromConfigFile, (fileContent) =>
          Option.fromNullable(fileContent[key]),
        ),
      ),
      Effect.orElseSucceed(() => DEFAULT_CONFIGURATION[key]),
    );

const readConfigFileContent = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const exists = yield* Effect.orDie(fs.exists(path));
    if (exists) {
      yield* Effect.logDebug(
        '[Configuration]: Found config file - attempting to read it',
      );
      const jsonFileContent = yield* readJsonFile(path);
      const configFileContent = yield* Schema.decodeUnknown(
        ConfigurationFileSchema,
      )(jsonFileContent);
      return Option.some(configFileContent);
    } else {
      yield* Effect.logDebug('[Configuration]: No config file found');
      return Option.none();
    }
  });

const readJsonFile = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const content = yield* Effect.orDie(fs.readFileString(path));
    return yield* Effect.try({
      try: () => JSON.parse(content),
      catch: (error) =>
        `[FileSystem] Unable to read and parse JSON file from '${path}': ${String(error)}`,
    });
  }).pipe(Effect.orDie);
