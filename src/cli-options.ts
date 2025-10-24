import * as Options from '@effect/cli/Options';
import * as HashMap from 'effect/HashMap';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { ConfigurationSchema } from './configuration';

// TODO: options for: type union priorities
const jsdocTag = Options.text('jsdocTag').pipe(
  Options.withDescription(
    'JSDoc tag used to mark types for data building generation.',
  ),
  Options.withSchema(ConfigurationSchema.fields.jsdocTag),
  Options.optional,
);

const outputDir = Options.text('output-dir').pipe(
  Options.withAlias('o'),
  Options.withDescription('Output directory for generated builders.'),
  Options.withSchema(ConfigurationSchema.fields.outputDir),
  Options.optional,
);

const include = Options.text('include').pipe(
  Options.withAlias('i'),
  Options.withDescription(
    'Glob pattern for files included while searching for jsdoc tag.',
  ),
  Options.withSchema(ConfigurationSchema.fields.include),
  Options.optional,
);

const fileSuffix = Options.text('file-suffix').pipe(
  Options.withDescription('File suffix for created builder files.'),
  Options.withSchema(ConfigurationSchema.fields.fileSuffix),
  Options.optional,
);

const builderSuffix = Options.text('builder-suffix').pipe(
  Options.withDescription('Suffix for generated classes.'),
  Options.withSchema(ConfigurationSchema.fields.builderSuffix),
  Options.optional,
);

const defaults = Options.keyValueMap('defaults').pipe(
  Options.withDescription(
    'Default values to be used in data builder constructor.',
  ),
  Options.withSchema(
    Schema.HashMapFromSelf({
      key: Schema.Literal('string', 'number', 'boolean'),
      value: Schema.String,
    }).pipe(
      Schema.transform(
        Schema.Struct({
          string: Schema.String,
          number: Schema.NumberFromString,
          boolean: Schema.BooleanFromString,
        }),
        {
          decode: (v) => {
            return {
              string: v.pipe(
                HashMap.get('string'),
                Option.getOrElse(() => ''),
              ),
              number: v.pipe(
                HashMap.get('number'),
                Option.getOrElse(() => '0'),
              ),
              boolean: v.pipe(
                HashMap.get('boolean'),
                Option.getOrElse(() => 'false'),
              ),
            };
          },
          encode: (v) => {
            return HashMap.make(
              ['string' as const, v.string],
              ['number' as const, v.number],
              ['boolean' as const, v.boolean],
            );
          },
          strict: false,
        },
      ),
    ),
  ),
  Options.optional,
);

export const options = {
  jsdocTag,
  outputDir,
  include,
  fileSuffix,
  builderSuffix,
  defaults,
};
