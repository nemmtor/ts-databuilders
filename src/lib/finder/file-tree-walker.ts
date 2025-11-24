import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import * as Process from '../process';
import * as Glob from './glob';

export class FileTreeWalker extends Effect.Service<FileTreeWalker>()(
  '@TSDataBuilders/FileTreeWalker',
  {
    effect: Effect.gen(function* () {
      yield* Effect.logDebug('[FileTreeWalker]: Instantiating');
      const glob = yield* Glob.Glob;
      const process = yield* Process.Process;

      return {
        walk: Effect.fnUntraced(function* (path: string) {
          const cwd = yield* process.cwd;
          yield* Effect.logDebug(
            `[FileTreeWalker]: Walking path: ${cwd}/${path}`,
          );

          return Stream.fromAsyncIterable(
            yield* glob.iterate({ path, cwd }),
            (cause) => new FileTreeWalkError({ cause }),
          );
        }),
      };
    }),
    dependencies: [Glob.Glob.Default],
  },
) {}

export class FileTreeWalkError extends Data.TaggedError('FileTreeWalkError')<{
  cause: unknown;
}> {}
