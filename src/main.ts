import * as BunContext from '@effect/platform-bun/BunContext';
import * as BunRuntime from '@effect/platform-bun/BunRuntime';
import { Glob } from 'bun';
import { Effect } from 'effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { CliLayer, cli } from './command';
import { TreeWalker, TreeWalkerError } from './tree-walker';

const BunTreeWalker = TreeWalker.of({
  walk: (path) => {
    const glob = new Glob(path);
    return Stream.fromAsyncIterable(
      glob.scan('.'),
      (originalError) => new TreeWalkerError({ cause: originalError }),
    );
  },
});

const MainLayer = Layer.empty.pipe(
  Layer.merge(Layer.succeed(TreeWalker, TreeWalker.of(BunTreeWalker))),
  Layer.merge(CliLayer),
  Layer.provideMerge(BunContext.layer),
);

cli(process.argv).pipe(Effect.provide(MainLayer), BunRuntime.runMain);
