import * as Options from '@effect/cli/Options';
import * as HashMap from 'effect/HashMap';
import * as Schema from 'effect/Schema';

// TODO: options for: type union priorities
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

export const DEFAULT_CONFIGURABLE_DEFAULTS = HashMap.fromIterable([
  ['string', '""'],
  ['number', '0'],
  ['boolean', 'false'],
] as const);

const defaults = Options.keyValueMap('defaults').pipe(
  Options.withDescription(
    'Default values to be used in data builder constructor.',
  ),
  Options.withSchema(
    Schema.HashMapFromSelf({
      key: Schema.Literal('string', 'number', 'boolean'),
      value: Schema.NumberFromString,
    }),
  ),
  Options.withDefault(DEFAULT_CONFIGURABLE_DEFAULTS),
);

export const options = {
  decorator,
  outputDir,
  include,
  fileSuffix,
  builderSuffix,
};
