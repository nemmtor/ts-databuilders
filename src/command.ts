import * as Command from '@effect/cli/Command';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import { BuilderGenerator } from './builder-generator';
import { Finder } from './finder';
import { Parser } from './parser';

const command = Command.make(
  'ts-databuilders',
  {},
  Effect.fnUntraced(
    function* () {
      const fs = yield* FileSystem.FileSystem;
      const finder = yield* Finder;
      const parser = yield* Parser;
      const builderGenerator = yield* BuilderGenerator;
      // TODO: replace hardcoded args
      const filePaths = yield* finder.find(
        '@DataBuilder',
        'example-data/**/*.ts',
      );
      const parsedTypes = yield* Effect.all(
        Chunk.map(filePaths, (filePath) =>
          parser.parse(filePath, '@DataBuilder'),
        ),
        { concurrency: 'unbounded' },
      ).pipe(Effect.map((v) => v.flatMap(Function.identity)));

      if (parsedTypes.length === 0) {
        return;
      }

      yield* fs.makeDirectory('generated/builders', { recursive: true });
      yield* builderGenerator.generateBaseBuilder('generated/builders');
      const generateBuildersEffect = parsedTypes.map((parsedType) =>
        Effect.sync(() =>
          builderGenerator.generateBuilderFor(parsedType, 'generated/builders'),
        ),
      );
      yield* Effect.all(generateBuildersEffect, { concurrency: 'unbounded' });
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

export const CliLayer = Layer.merge(Finder.Default, Parser.Default);
