import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import * as FileContentChecker from './file-content-checker';
import * as FileTreeWalker from './file-tree-walker';

export class Finder extends Effect.Service<Finder>()('@TSDataBuilders/Finder', {
  effect: Effect.gen(function* () {
    yield* Effect.logDebug('[Finder]: Instantiating');
    const fileContentChecker = yield* FileContentChecker.FileContentChecker;
    const fileTreeWalker = yield* FileTreeWalker.FileTreeWalker;

    return {
      find: Effect.fnUntraced(
        function* (opts: { pattern: string; include: string }) {
          yield* Effect.logDebug(
            `[Finder]: Searching file paths in ${opts.include}`,
          );
          const pathsStream = yield* fileTreeWalker.walk(opts.include);

          yield* Effect.logDebug(
            `[Finder]: Checking which files include at least 1 occurance of ${opts.pattern}`,
          );
          const fileNamesWithContent = yield* pathsStream.pipe(
            Stream.mapEffect(
              (filePath) =>
                fileContentChecker
                  .check({ filePath, content: opts.pattern })
                  .pipe(Effect.map((v) => v.pipe(Option.map(() => filePath)))),
              { concurrency: 'unbounded' },
            ),
            Stream.runCollect,
            Effect.map(Chunk.filter((v) => Option.isSome(v))),
            Effect.map(Chunk.map((v) => v.value)),
          );

          yield* Effect.logDebug(
            `[Finder]: Found files with expected pattern: ${fileNamesWithContent.pipe(Chunk.toArray).join(', ')}`,
          );
          return fileNamesWithContent;
        },
        Effect.catchTag('FileTreeWalkError', (cause) => Effect.die(cause)),
      ),
    };
  }),
  dependencies: [
    FileTreeWalker.FileTreeWalker.Default,
    FileContentChecker.FileContentChecker.Default,
  ],
}) {}
