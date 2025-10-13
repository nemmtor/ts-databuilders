import * as Chunk from 'effect/Chunk';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import { TreeWalker } from '../tree-walker';
import { FileContentChecker } from './file-content-checker';
export class Finder extends Effect.Service<Finder>()('@TSDataBuilders/Finder', {
  effect: Effect.gen(function* () {
    const fileContentChecker = yield* FileContentChecker;
    const include = yield* Config.string('include');

    return {
      find: Effect.fnUntraced(function* () {
        const treeWalker = yield* TreeWalker;
        const pathsStream = treeWalker.walk(include);

        const fileNamesWithContent = yield* pathsStream.pipe(
          Stream.mapEffect(
            (filePath) =>
              fileContentChecker
                .check(filePath)
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
