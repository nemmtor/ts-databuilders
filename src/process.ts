import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

export interface ProcessShape {
  readonly cwd: Effect.Effect<string>;
}

export class Process extends Context.Tag('Process')<Process, ProcessShape>() {}

export const layer = Layer.succeed(
  Process,
  Process.of({
    cwd: Effect.sync(() => process.cwd()),
  }),
);
