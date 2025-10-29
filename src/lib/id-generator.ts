import { randomUUID } from 'node:crypto';

import * as Effect from 'effect/Effect';

export class IdGenerator extends Effect.Service<IdGenerator>()(
  '@TSDataBuilders/IdGenerator',
  {
    succeed: {
      generateUuid: Effect.sync(() => randomUUID()),
    },
  },
) {}
