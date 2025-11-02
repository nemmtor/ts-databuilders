import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as EffectFunction from 'effect/Function';

import * as BuildersGenerator from './builders-generator';
import * as Finder from './finder';
import * as Parser from './parser';

export const program = Effect.gen(function* () {
  const finder = yield* Finder.Finder;
  const parser = yield* Parser.Parser;
  const builders = yield* BuildersGenerator.BuildersGenerator;

  yield* Effect.logInfo(
    '[TSDatabuilders]: Generating builders for your project.',
  );
  const filePaths = yield* finder.find;
  yield* Effect.logInfo(
    `[TSDatabuilders]: Found builders in ${filePaths.length} file(s).`,
  );
  yield* Effect.logDebug(
    '[TSDatabuilders]: Attempting to generate builders metadata',
  );
  const metadata = yield* Effect.all(
    Chunk.map(filePaths, (filePath) =>
      parser.generateBuildersMetadata(filePath),
    ),
    { concurrency: 'unbounded' },
  ).pipe(Effect.map((v) => v.flatMap(EffectFunction.identity)));

  if (metadata.length === 0) {
    return;
  }

  yield* Effect.logDebug(
    '[TSDatabuilders]: Attempting to create builders files',
  );
  yield* builders.create(metadata);
  yield* Effect.logInfo(
    `[TSDatabuilders]: Created ${metadata.length} builder(s).`,
  );
});
