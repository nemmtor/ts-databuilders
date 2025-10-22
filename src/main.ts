#!/usr/bin/env node
import * as NodeContext from '@effect/platform-node/NodeContext';
import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import { Effect } from 'effect';
import { cli } from './cli';

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
