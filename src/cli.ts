import * as Command from '@effect/cli/Command';
import * as Layer from 'effect/Layer';
import { Builders } from './builders';
import { options } from './cli-options';
import { Configuration } from './configuration';
import { Finder } from './finder';
import { Parser } from './parser';
import { program } from './program';

const databuilderCommand = Command.make('ts-databuilders', options);
export const cli = databuilderCommand.pipe(
  Command.withHandler(() => program),
  Command.provide((providedOptions) =>
    Layer.mergeAll(Finder.Default, Parser.Default, Builders.Default).pipe(
      Layer.provide(
        Layer.succeed(Configuration, Configuration.of(providedOptions)),
      ),
    ),
  ),
  Command.run({
    name: 'Typescript Databuilders generator',
    version: 'v0.0.1',
  }),
);
