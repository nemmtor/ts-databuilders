import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { IdGenerator } from './id-generator';

describe('IdGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(IdGenerator.Default)((it) => {
    it.effect('should generate uuid', () =>
      Effect.gen(function* () {
        const idGenerator = yield* IdGenerator;
        const uuid = yield* idGenerator.generateUuid;

        const result = yield* Schema.UUID.pipe(Schema.decodeUnknown)(uuid);

        expect(result).toBeDefined();
      }),
    );
  });
});
