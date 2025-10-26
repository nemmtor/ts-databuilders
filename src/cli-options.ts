import * as Options from '@effect/cli/Options';
import { CliConfigurationSchema } from './configuration';
import { DESCRIPTIONS } from './descriptions';

// TODO: options for: type union priorities
const jsdocTag = Options.text('jsdoc-tag').pipe(
  Options.withDescription(DESCRIPTIONS.jsdocTag),
  Options.withSchema(CliConfigurationSchema.fields.jsdocTag),
  Options.optional,
);

const outputDir = Options.text('output-dir').pipe(
  Options.withAlias('o'),
  Options.withDescription(DESCRIPTIONS.outputDir),
  Options.withSchema(CliConfigurationSchema.fields.outputDir),
  Options.optional,
);

const include = Options.text('include').pipe(
  Options.withAlias('i'),
  Options.withDescription(DESCRIPTIONS.include),
  Options.withSchema(CliConfigurationSchema.fields.include),
  Options.optional,
);

const fileSuffix = Options.text('file-suffix').pipe(
  Options.withDescription(DESCRIPTIONS.fileSuffix),
  Options.withSchema(CliConfigurationSchema.fields.fileSuffix),
  Options.optional,
);

const builderSuffix = Options.text('builder-suffix').pipe(
  Options.withDescription(DESCRIPTIONS.builderSuffix),
  Options.withSchema(CliConfigurationSchema.fields.builderSuffix),
  Options.optional,
);

const defaultString = Options.text('default-string').pipe(
  Options.withDescription(DESCRIPTIONS.defaultString),
  Options.withSchema(CliConfigurationSchema.fields.defaultString),
  Options.optional,
);

const defaultNumber = Options.text('default-number').pipe(
  Options.withDescription(DESCRIPTIONS.defaultNumber),
  Options.withSchema(CliConfigurationSchema.fields.defaultNumber),
  Options.optional,
);

const defaultBoolean = Options.text('default-boolean').pipe(
  Options.withDescription(DESCRIPTIONS.defaultBoolean),
  Options.withSchema(CliConfigurationSchema.fields.defaultBoolean),
  Options.optional,
);

export const options = {
  jsdocTag,
  outputDir,
  include,
  fileSuffix,
  builderSuffix,
  defaultString,
  defaultNumber,
  defaultBoolean,
};
