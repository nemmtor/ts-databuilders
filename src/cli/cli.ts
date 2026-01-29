import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Layer from 'effect/Layer';

import * as BuilderGenerator from '../builder-generator';
import * as Finder from '../lib/finder';
import * as Process from '../lib/process';
import * as ProjectParser from '../lib/project-parser';
import * as Configuration from './configuration';
import * as CONSTANTS from './constants';
import * as CreateJSONConfig from './create-json-config';
import * as GenerateBuilders from './generate-builders';
import * as Version from './version';

const builderJsDocTagName = Options.text('builder-jsdoc-tag-name').pipe(
  Options.withDescription(CONSTANTS.DESCRIPTIONS.builderJsDocTagName),
  Options.withSchema(
    Configuration.CliConfigurationSchema.fields.builderJsDocTagName,
  ),
  Options.optional,
);

const inlineDefaultJsDocTagName = Options.text(
  'inline-default-jsdoc-tag-name',
).pipe(
  Options.withDescription(CONSTANTS.DESCRIPTIONS.inlineDefaultJsDocTagName),
  Options.withSchema(
    Configuration.CliConfigurationSchema.fields.inlineDefaultJsDocTagName,
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

const fileCase = Options.text('file-case').pipe(
  Options.withDescription(CONSTANTS.DESCRIPTIONS.fileCase),
  Options.withSchema(Configuration.CliConfigurationSchema.fields.fileCase),
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

const options = {
  builderJsDocTagName,
  outputDir,
  withNestedBuilders,
  include,
  fileSuffix,
  fileCase,
  builderSuffix,
  defaultString,
  defaultNumber,
  defaultBoolean,
  inlineDefaultJsDocTagName,
};

const initCommand = Command.make('init', options).pipe(
  Command.withHandler(CreateJSONConfig.program),
);

const databuilderCommand = Command.make('ts-databuilders', options);
export const rootCommand = databuilderCommand.pipe(
  Command.withHandler(() => GenerateBuilders.program),
  Command.withSubcommands([initCommand]),
  Command.provide((providedOptions) =>
    Layer.mergeAll(
      Finder.Finder.Default,
      ProjectParser.ProjectParser.Default,
      BuilderGenerator.FileBuilderGenerator.Default,
      BuilderGenerator.BaseBuilderGenerator.Default,
    ).pipe(
      Layer.provideMerge(GenerateBuilders.ParseDeclarationPredicateLayer),
      Layer.provideMerge(
        Layer.effect(
          Configuration.Configuration,
          Configuration.load(providedOptions),
        ),
      ),
      Layer.provideMerge(Process.Process.Default),
    ),
  ),
  Command.run({
    name: 'Typescript Databuilders generator',
    version: Version.version,
  }),
);
