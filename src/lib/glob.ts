import { glob } from 'glob';

import * as Effect from 'effect/Effect';

export class Glob extends Effect.Service<Glob>()('@TSDataBuilders/Glob', {
  succeed: {
    iterate: (opts: { path: string; cwd: string }) =>
      Effect.sync(() =>
        glob.iterate(opts.path, { cwd: opts.cwd, nodir: true }),
      ),
  },
}) {}
