import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import { Builders } from './builders';
import { Finder } from './finder';
import { Parser } from './parser';

export const program = Effect.gen(function* () {
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
});
