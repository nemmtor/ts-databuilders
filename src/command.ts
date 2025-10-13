import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Chunk from 'effect/Chunk';
import * as ConfigProvider from 'effect/ConfigProvider';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { Builders } from './builders';
import { Finder } from './finder';
import { Parser } from './parser';

// TODO: schema validation
const decorator = Options.text('decorator').pipe(
  Options.withAlias('d'),
  Options.withDescription(
    'JSDoc decorator used to mark types for data building generation.',
  ),
  Options.withSchema(Schema.NonEmptyTrimmedString),
  Options.withDefault('@DataBuilder'),
);

const outputDir = Options.text('output-dir').pipe(
  Options.withAlias('o'),
  Options.withDescription('Output directory for generated builders.'),
  Options.withSchema(Schema.NonEmptyTrimmedString),
  Options.withDefault('generated/builders'),
);

const include = Options.text('include').pipe(
  Options.withAlias('i'),
  Options.withDescription(
    'Glob pattern for files included while searching for jsdoc tag.',
  ),
  Options.withSchema(Schema.NonEmptyTrimmedString),
  Options.withDefault('src/**/*.ts{,x}'),
);

const fileSuffix = Options.text('file-suffix').pipe(
  Options.withDescription('File suffix for created builder files.'),
  Options.withSchema(Schema.NonEmptyTrimmedString),
  Options.withDefault('.builder'),
);

const builderSuffix = Options.text('builder-suffix').pipe(
  Options.withDescription('Suffix for generated classes.'),
  Options.withSchema(Schema.NonEmptyTrimmedString),
  Options.withDefault('Builder'),
);

// TODO: options for: default values, type union priorities

const command = Command.make(
  'ts-databuilders',
  { decorator, outputDir, include, fileSuffix, builderSuffix },
  (options) =>
    Effect.gen(function* () {
      const finder = yield* Finder;
      const parser = yield* Parser;
      const builders = yield* Builders;

      const filePaths = yield* finder.find();
      const metadata = yield* Effect.all(
        Chunk.map(filePaths, (filePath) =>
          parser.generateBuildersMetadata(filePath),
        ),
        { concurrency: 'unbounded' },
      ).pipe(Effect.map((v) => v.flatMap(Function.identity)));

      if (metadata.length === 0) {
        return;
      }

      yield* builders.create(metadata);
    }).pipe(
      Effect.provide(CliLayer),
      Effect.withConfigProvider(ConfigProvider.fromJson(options)),
      Effect.catchTags({
        UnsupportedSyntaxKind: ({ kind, raw }) =>
          Effect.dieMessage(`Unsupported syntax kind ${kind} for ${raw}`),
      }),
    ),
);

export const cli = Command.run(command, {
  name: 'Typescript Databuilders generator',
  version: 'v0.0.1',
});

const CliLayer = Layer.mergeAll(
  Finder.Default,
  Parser.Default,
  Builders.Default,
);
