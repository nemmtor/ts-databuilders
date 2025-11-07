import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Layer from 'effect/Layer';

import * as BuildersGenerator from './builders-generator';
import * as Configuration from './configuration';
import * as CONSTANTS from './constants';
import { createJsonConfig } from './create-json-config';
import * as Finder from './finder';
import * as Parser from './parser';
import { program } from './program';

// TODO: options for: type union priorities
const jsdocTag = Options.text('jsdoc-tag').pipe(
  Options.withDescription(CONSTANTS.DESCRIPTIONS.jsdocTag),
  Options.withSchema(Configuration.CliConfigurationSchema.fields.jsdocTag),
  Options.optional,
);

const inlineDefaultJsdocTag = Options.text('inline-default-jsdoc-tag').pipe(
  Options.withDescription(CONSTANTS.DESCRIPTIONS.inlineDefaultJsdocTag),
  Options.withSchema(
    Configuration.CliConfigurationSchema.fields.inlineDefaultJsdocTag,
  ),
  Options.optional,
);

const withNestedBuilders = Options.text('with-nested-builders').pipe(
  Options.withDescription(CONSTANTS.DESCRIPTIONS.withNestedbuilders),
  Options.withSchema(
    Configuration.CliConfigurationSchema.fields.withNestedBuilders,
  ),
  Options.optional,
);

const outputDir = Options.text('output-dir').pipe(
  Options.withAlias('o'),
  Options.withDescription(CONSTANTS.DESCRIPTIONS.outputDir),
  Options.withSchema(Configuration.CliConfigurationSchema.fields.outputDir),
  Options.optional,
);

const include = Options.text('include').pipe(
  Options.withAlias('i'),
  Options.withDescription(CONSTANTS.DESCRIPTIONS.include),
  Options.withSchema(Configuration.CliConfigurationSchema.fields.include),
  Options.optional,
);

const fileSuffix = Options.text('file-suffix').pipe(
  Options.withDescription(CONSTANTS.DESCRIPTIONS.fileSuffix),
  Options.withSchema(Configuration.CliConfigurationSchema.fields.fileSuffix),
  Options.optional,
);

const builderSuffix = Options.text('builder-suffix').pipe(
  Options.withDescription(CONSTANTS.DESCRIPTIONS.builderSuffix),
  Options.withSchema(Configuration.CliConfigurationSchema.fields.builderSuffix),
  Options.optional,
);

const defaultString = Options.text('default-string').pipe(
  Options.withDescription(CONSTANTS.DESCRIPTIONS.defaultString),
  Options.withSchema(Configuration.CliConfigurationSchema.fields.defaultString),
  Options.optional,
);

const defaultNumber = Options.text('default-number').pipe(
  Options.withDescription(CONSTANTS.DESCRIPTIONS.defaultNumber),
  Options.withSchema(Configuration.CliConfigurationSchema.fields.defaultNumber),
  Options.optional,
);

const defaultBoolean = Options.text('default-boolean').pipe(
  Options.withDescription(CONSTANTS.DESCRIPTIONS.defaultBoolean),
  Options.withSchema(
    Configuration.CliConfigurationSchema.fields.defaultBoolean,
  ),
  Options.optional,
);

export const options = {
  jsdocTag,
  outputDir,
  withNestedBuilders,
  include,
  fileSuffix,
  builderSuffix,
  defaultString,
  defaultNumber,
  defaultBoolean,
  inlineDefaultJsdocTag,
};

const initCommand = Command.make('init', options).pipe(
  Command.withHandler(createJsonConfig),
);

const databuilderCommand = Command.make('ts-databuilders', options);
export const cli = databuilderCommand.pipe(
  Command.withHandler(() => program),
  Command.withSubcommands([initCommand]),
  Command.provide((providedOptions) =>
    Layer.mergeAll(
      Finder.Finder.Default,
      Parser.Parser.Default,
      BuildersGenerator.BuildersGenerator.Default,
    ).pipe(
      Layer.provide(
        Layer.effect(
          Configuration.Configuration,
          Configuration.load(providedOptions),
        ),
      ),
    ),
  ),
  Command.run({
    name: 'Typescript Databuilders generator',
    version: 'v0.0.1',
  }),
);
