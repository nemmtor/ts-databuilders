import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import { FileContentChecker } from './file-content-checker';
import { TreeWalker } from './tree-walker';

export class Finder extends Effect.Service<Finder>()('@TSDataBuilders/Finder', {
  effect: Effect.gen(function* () {
    const fileContentChecker = yield* FileContentChecker;

    return {
      // TODO: these could done be via DI
      find: Effect.fnUntraced(function* (term: string, glob: string) {
        const treeWalker = yield* TreeWalker;
        const pathsStream = treeWalker.walk(glob);

        const fileNamesWithContent = yield* pathsStream.pipe(
          Stream.mapEffect(
            (filePath) =>
              fileContentChecker
                .check(filePath, term)
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

        return fileNamesWithContent;
      }),
    };
  }),
  dependencies: [FileContentChecker.Default],
}) {}
