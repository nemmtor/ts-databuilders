import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import * as Glob from './glob';
import * as Process from './process';

export class TreeWalker extends Effect.Service<TreeWalker>()(
  '@TSDataBuilders/TreeWalker',
  {
    effect: Effect.gen(function* () {
      const glob = yield* Glob.Glob;
      const process = yield* Process.Process;
      return {
        walk: Effect.fnUntraced(function* (path: string) {
          const cwd = yield* process.cwd;
          yield* Effect.logDebug(`[TreeWalker]: Walking path: ${cwd}/${path}`);

          return Stream.fromAsyncIterable(
            yield* glob.iterate({ path, cwd }),
            (cause) => new TreeWalkerError({ cause }),
          );
        }),
      };
    }),
    dependencies: [Glob.Glob.Default],
  },
) {}

export class TreeWalkerError extends Data.TaggedError('TreeWalkerError')<{
  cause: unknown;
}> {}
