import * as BunContext from '@effect/platform-bun/BunContext';
import * as BunRuntime from '@effect/platform-bun/BunRuntime';
import { Glob } from 'bun';
import { Effect } from 'effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { cli } from './cli';
import { TreeWalker, TreeWalkerError } from './tree-walker';

// TODO: is this really needed?
const BunTreeWalker = TreeWalker.of({
  walk: (path) => {
    const glob = new Glob(path);
    return Stream.fromAsyncIterable(
      glob.scan('.'),
      (cause) => new TreeWalkerError({ cause }),
    );
  },
});

const MainLayer = Layer.empty.pipe(
  Layer.merge(Layer.succeed(TreeWalker, TreeWalker.of(BunTreeWalker))),
  Layer.provideMerge(BunContext.layer),
);

cli(process.argv).pipe(Effect.provide(MainLayer), BunRuntime.runMain);
