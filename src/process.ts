import * as Effect from 'effect/Effect';

export class Process extends Effect.Service<Process>()(
  '@TSDataBuilders/Process',
  {
    succeed: {
      cwd: Effect.sync(() => process.cwd()),
    },
  },
) {}
