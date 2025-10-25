import * as Command from '@effect/cli/Command';
import * as Layer from 'effect/Layer';
import * as Builders from './builders';
import { options } from './cli-options';
import * as Configuration from './configuration';
import * as Finder from './finder';
import * as Parser from './parser';
import { program } from './program';

const databuilderCommand = Command.make('ts-databuilders', options);
export const cli = databuilderCommand.pipe(
  Command.withHandler(() => program),
  Command.provide((providedOptions) =>
    Layer.mergeAll(
      Finder.Finder.Default,
      Parser.Parser.Default,
      Builders.Builders.Default,
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
