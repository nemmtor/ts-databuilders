import * as BunContext from '@effect/platform-bun/BunContext';
import * as BunRuntime from '@effect/platform-bun/BunRuntime';
import { Effect } from 'effect';
import { cli } from './cli';

cli(process.argv).pipe(Effect.provide(BunContext.layer), BunRuntime.runMain);
