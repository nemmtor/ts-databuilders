import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import { Configuration } from '../configuration';
import { TreeWalker } from '../tree-walker';
import { FileContentChecker } from './file-content-checker';

export class Finder extends Effect.Service<Finder>()('@TSDataBuilders/Finder', {
  effect: Effect.gen(function* () {
    const fileContentChecker = yield* FileContentChecker;
    const treeWalker = yield* TreeWalker;
    const { include, jsdocTag } = yield* Configuration;
    const decorator = `@${jsdocTag}`;

    return {
      find: Effect.fnUntraced(
        function* () {
          yield* Effect.logDebug(
            '[Finder]: Attempting to find files with builders',
          );

          const pathsStream = yield* treeWalker.walk(include);

          const fileNamesWithContent = yield* pathsStream.pipe(
            Stream.mapEffect(
              (filePath) =>
                fileContentChecker
                  .check({ filePath, content: decorator })
                  .pipe(
                    Effect.map(
                      Chunk.map((v) =>
                        v ? Option.some(filePath) : Option.none(),
                      ),
                    ),
                  ),
              { concurrency: 'unbounded' },
            ),
            Stream.runCollect,
            Effect.map(Chunk.flatMap(Function.identity)),
            Effect.map(Chunk.filter((v) => Option.isSome(v))),
            Effect.map(Chunk.map((v) => v.value)),
          );

          yield* Effect.logDebug(
            `[Finder]: Found builders in files: ${fileNamesWithContent.pipe(Chunk.toArray).join(', ')}`,
          );
          return fileNamesWithContent;
        },
        Effect.catchTag('TreeWalkerError', (cause) => Effect.die(cause)),
      ),
    };
  }),
  dependencies: [TreeWalker.Default, FileContentChecker.Default],
}) {}
