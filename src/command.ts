import * as Command from '@effect/cli/Command';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import { Finder } from './finder';
import { Parser } from './parser';

const command = Command.make(
  'ts-databuilders',
  {},
  Effect.fnUntraced(function* () {
    const finder = yield* Finder;
    const parser = yield* Parser;
    // TODO: replace hardcoded args
    const filePaths = yield* finder.find(
      '@DataBuilder',
      'example-data/**/*.ts',
    );
    const results = yield* Effect.all(
      Chunk.map(filePaths, (filePath) =>
        parser.parse(filePath, '@DataBuilder'),
      ),
      { concurrency: 4 },
    );
    const flatResult = results.flatMap(Function.identity);
    yield* Effect.log(flatResult);
  }),
);

export const cli = Command.run(command, {
  name: 'Typescript Databuilders generator',
  version: 'v0.0.1',
});

export const CliLayer = Layer.merge(Finder.Default, Parser.Default);
