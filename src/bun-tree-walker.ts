import { Glob } from 'bun';
import * as Stream from 'effect/Stream';
import { TreeWalker, TreeWalkerError } from './tree-walker';

// TODO: is this really needed?
export const BunTreeWalker = TreeWalker.of({
  walk: (path) => {
    const glob = new Glob(path);
    return Stream.fromAsyncIterable(
      glob.scan('.'),
      (cause) => new TreeWalkerError({ cause }),
    );
  },
});
