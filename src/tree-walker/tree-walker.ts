import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import type * as Stream from 'effect/Stream';

export class TreeWalker extends Context.Tag('TreeWalker')<
  TreeWalker,
  {
    walk: (path: string) => Stream.Stream<string, TreeWalkerError, never>;
  }
>() {}

export class TreeWalkerError extends Data.TaggedError('TreeWalkerError')<{
  cause: unknown;
}> {}
