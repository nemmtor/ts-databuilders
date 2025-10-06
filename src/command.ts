import * as Command from '@effect/cli/Command';
import * as Effect from 'effect/Effect';
import { Finder } from './finder';

const command = Command.make(
  'ts-databuilders',
  {},
  Effect.fnUntraced(function* () {
    const finder = yield* Finder;
    // TODO: replace hardcoded args
    const files = yield* finder.find('@DataBuilder', 'example-data');
    yield* Effect.log(files);
    // for each file of files:
    // get all type definitions annotated with @DataBuilder
  }),
);

export const cli = Command.run(command, {
  name: 'Typescript Databuilders generator',
  version: 'v0.0.1',
});

export const CliLayer = Finder.Default;
