import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Process } from './process';

describe('Process', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(Process.Default)((it) => {
    it.effect(
      'should retrieve current working directory',
      Effect.fn(function* () {
        vi.spyOn(process, 'cwd').mockReturnValueOnce('/mock/path');
        const processService = yield* Process;
        const cwd = yield* processService.cwd;

        expect(cwd).toBe('/mock/path');
      }),
    );
  });
});
