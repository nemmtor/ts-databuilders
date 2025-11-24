import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as EffectFunction from 'effect/Function';

import * as ASTParser from '../lib/ast-parser';
import * as Finder from '../lib/finder';
import * as Configuration from './configuration';

export const program = Effect.gen(function* () {
  const finder = yield* Finder.Finder;
  const astParser = yield* ASTParser.ASTParser;
  // const builders = yield* BuildersGenerator.BuildersGenerator;
  const { include, jsdocTag } = yield* Configuration.Configuration;

  yield* Effect.logInfo(
    '[TSDatabuilders]: Generating builders for your project.',
  );

  const filePaths = yield* finder.find({ include, pattern: `@${jsdocTag}` });
  yield* Effect.logInfo(
    `[TSDatabuilders]: Found builders in ${filePaths.length} file(s).`,
  );
  yield* Effect.logDebug(
    '[TSDatabuilders]: Attempting to generate builders metadata',
  );
  const metadata = yield* Effect.all(
    Chunk.map(filePaths, (filePath) => astParser.parse(filePath)),
    { concurrency: 'unbounded' },
  ).pipe(Effect.map((v) => v.flatMap(EffectFunction.identity)));

  if (metadata.length === 0) {
    return;
  }

  yield* Effect.logDebug(
    '[TSDatabuilders]: Attempting to create builders files',
  );
  // yield* builders.create(metadata);
  yield* Effect.logInfo(
    `[TSDatabuilders]: Created ${metadata.length} builder(s).`,
  );
});
