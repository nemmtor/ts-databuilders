#!/usr/bin/env node
import * as NodeContext from '@effect/platform-node/NodeContext';
import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import { Effect } from 'effect';
import * as Layer from 'effect/Layer';
import { cli } from './cli';
import * as Process from './process';

const MainLive = Layer.mergeAll(Process.Process.Default, NodeContext.layer);

cli(process.argv).pipe(Effect.provide(MainLive), NodeRuntime.runMain);
