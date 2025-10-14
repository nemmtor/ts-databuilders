import * as Command from '@effect/cli/Command';
import * as Chunk from 'effect/Chunk';
import * as ConfigProvider from 'effect/ConfigProvider';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import { Builders } from './builders';
import { commandOptions } from './command-options';
import { Finder } from './finder';
import { Parser } from './parser';

const command = Command.make('ts-databuilders', commandOptions, (options) =>
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
