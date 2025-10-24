import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { glob } from 'glob';

export class TreeWalker extends Effect.Service<TreeWalker>()(
  '@TSDataBuilders/TreeWalker',
  {
    succeed: {
      walk: (path: string) => {
        return Stream.fromAsyncIterable(
          glob.stream(path, { cwd: '.', nodir: true }),
          (cause) => new TreeWalkerError({ cause }),
        );
      },
    },
  },
) {}

class TreeWalkerError extends Data.TaggedError('TreeWalkerError')<{
  cause: unknown;
}> {}
