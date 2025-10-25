import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Process from './process';

const CONFIG_FILE_NAME = 'ts-databuilders.json';

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

const DEFAULT_CONFIGURATION = ConfigurationSchema.make({
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

export const ConfigurationFileSchema = ConfigurationSchema.pipe(
  Schema.omit('defaults'),
  Schema.extend(
    Schema.Struct({
      $schema: Schema.optional(Schema.String),
      defaults: Schema.Struct({
        string: Schema.String,
        number: Schema.Number,
        boolean: Schema.Boolean,
      }).pipe(Schema.partial),
    }),
  ),
  Schema.partial,
);
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
  defaults: Schema.Struct({
    string: Schema.String,
    number: Schema.Number,
    boolean: Schema.Boolean,
  }).pipe(Schema.partial),
});
type CliConfigurationShape = typeof CliConfigurationSchema.Type;

type LoadConfigurationOptions = {
  [key in keyof CliConfigurationShape]: Option.Option<
    CliConfigurationShape[key]
  >;
};

export const load = (opts: LoadConfigurationOptions) =>
  Effect.gen(function* () {
    const process = yield* Process.Process;
    const cwd = yield* process.cwd;
    const path = yield* Path.Path;
    const configPath = path.join(cwd, CONFIG_FILE_NAME);
    const configFileContent = yield* readConfigFileContent(configPath);
    const config = yield* resolveConfig({
      providedConfiguration: opts,
      configFileContent,
    });
    return Configuration.of(config);
  });

const resolveConfig = (opts: {
  providedConfiguration: LoadConfigurationOptions;
  configFileContent: Option.Option<ConfigurationFileShape>;
}): Effect.Effect<ConfigurationShape> =>
  Effect.gen(function* () {
    const resolve = resolveConfigValue(opts);

    const defaultsFromCli = opts.providedConfiguration.defaults.pipe(
      Option.getOrElse(() => ({})),
    );
    const defaultsFromFile = Option.flatMap(
      opts.configFileContent,
      (fileContent) => Option.fromNullable(fileContent.defaults),
    ).pipe(Option.getOrElse(() => ({})));
    const providedDefaultsFromCli = Object.fromEntries(
      Object.entries(defaultsFromCli).filter(
        ([_, v]) => typeof v !== 'undefined',
      ),
    );
    const providedDefaultsFromFile = Object.fromEntries(
      Object.entries(defaultsFromFile).filter(
        ([_, v]) => typeof v !== 'undefined',
      ),
    );
    const providedDefaults = {
      ...providedDefaultsFromFile,
      ...providedDefaultsFromCli,
    };

    return {
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
  });

const resolveConfigValue =
  (opts: {
    providedConfiguration: LoadConfigurationOptions;
    configFileContent: Option.Option<ConfigurationFileShape>;
  }) =>
  <K extends keyof ConfigurationShape>(key: K) =>
    opts.providedConfiguration[key].pipe(
      Effect.orElse(() =>
        Option.flatMap(opts.configFileContent, (fileContent) =>
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
      const jsonFileContent = yield* readJsonFile(path);
      const configFileContent = yield* Schema.decodeUnknown(
        ConfigurationFileSchema,
      )(jsonFileContent);
      return Option.some(configFileContent);
    } else {
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
