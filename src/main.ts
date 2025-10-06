import { Command } from '@effect/cli';
import { BunContext, BunRuntime } from '@effect/platform-bun';
import { Console, Effect } from 'effect';

const command = Command.make('ts-databuilders', {}, () =>
  Console.log('Hello World'),
);

const cli = Command.run(command, {
  name: 'Typescript Databuilders generator',
  version: 'v0.0.1',
});

cli(process.argv).pipe(Effect.provide(BunContext.layer), BunRuntime.runMain);
