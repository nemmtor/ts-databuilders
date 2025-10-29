import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import * as Configuration from './configuration';
import * as FileContentChecker from './lib/file-content-checker';
import * as TreeWalker from './lib/tree-walker';

export class Finder extends Effect.Service<Finder>()('@TSDataBuilders/Finder', {
  effect: Effect.gen(function* () {
    const fileContentChecker = yield* FileContentChecker.FileContentChecker;
    const treeWalker = yield* TreeWalker.TreeWalker;
    const { include, jsdocTag } = yield* Configuration.Configuration;
    const decorator = `@${jsdocTag}`;

    return {
      find: Effect.gen(function* () {
        yield* Effect.logDebug(
          '[Finder]: Attempting to find files with builders',
        );

        const pathsStream = yield* treeWalker.walk(include);

        const fileNamesWithContent = yield* pathsStream.pipe(
          Stream.mapEffect(
            (filePath) =>
              fileContentChecker
                .check({ filePath, content: decorator })
                .pipe(Effect.map((v) => v.pipe(Option.map(() => filePath)))),
            { concurrency: 'unbounded' },
          ),
          Stream.runCollect,
          Effect.map(Chunk.filter((v) => Option.isSome(v))),
          Effect.map(Chunk.map((v) => v.value)),
        );

        yield* Effect.logDebug(
          `[Finder]: Found builders in files: ${fileNamesWithContent.pipe(Chunk.toArray).join(', ')}`,
        );
        return fileNamesWithContent;
      }).pipe(Effect.catchTag('TreeWalkerError', (cause) => Effect.die(cause))),
    };
  }),
  dependencies: [
    TreeWalker.TreeWalker.Default,
    FileContentChecker.FileContentChecker.Default,
  ],
}) {}
