import { randomUUID } from 'node:crypto';
import * as Effect from 'effect/Effect';

export class RandomUUID extends Effect.Service<RandomUUID>()(
  '@TSDataBuilders/RandomUUID',
  {
    succeed: {
      generate: Effect.sync(() => randomUUID()),
    },
  },
) {}
