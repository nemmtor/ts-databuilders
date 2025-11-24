import * as NodeCrypto from 'node:crypto';

import * as Effect from 'effect/Effect';

export class IdGenerator extends Effect.Service<IdGenerator>()(
  '@TSDataBuilders/IdGenerator',
  {
    succeed: {
      generateUuid: Effect.sync(() => NodeCrypto.randomUUID()),
    },
  },
) {}
