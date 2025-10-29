import * as NodeContext from '@effect/platform-node/NodeContext';
import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Logger from 'effect/Logger';
import * as LogLevel from 'effect/LogLevel';

import { cli } from './cli';
import * as Process from './lib/process';

const MainLive = Layer.mergeAll(
  Logger.minimumLogLevel(LogLevel.Debug),
  Process.Process.Default,
  NodeContext.layer,
);

cli(process.argv).pipe(Effect.provide(MainLive), NodeRuntime.runMain);
