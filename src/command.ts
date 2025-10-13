import * as Command from '@effect/cli/Command';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import { Builders } from './builders';
import { Finder } from './finder';
import { Parser } from './parser';

const command = Command.make(
  'ts-databuilders',
  {},
  Effect.fnUntraced(
    function* () {
      const finder = yield* Finder;
      const parser = yield* Parser;
      const builders = yield* Builders;

      const filePaths = yield* finder.find(
        '@DataBuilder',
        'example-data/**/*.ts',
      );
      const metadata = yield* Effect.all(
        Chunk.map(filePaths, (filePath) =>
          parser.generateBuildersMetadata(filePath, '@DataBuilder'),
        ),
        { concurrency: 'unbounded' },
      ).pipe(Effect.map((v) => v.flatMap(Function.identity)));

      if (metadata.length === 0) {
        return;
      }

      yield* builders.create(metadata, 'generated/builders');
    },
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

export const CliLayer = Layer.mergeAll(
  Finder.Default,
  Parser.Default,
  Builders.Default,
);
