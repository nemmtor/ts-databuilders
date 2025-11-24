import * as glob from 'glob';

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

export class Glob extends Effect.Service<Glob>()('@TSDataBuilders/Glob', {
  effect: Effect.gen(function* () {
    yield* Effect.logDebug('[Glob]: Instantiating');

    return {
      iterate: Effect.fnUntraced(function* (opts: {
        path: string;
        cwd: string;
      }) {
        yield* Effect.logDebug(`[Glob]: Iterating ${opts.path} in ${opts.cwd}`);
        return yield* Effect.try({
          try: () =>
            glob.glob.iterate(opts.path, { cwd: opts.cwd, nodir: true }),
          catch: (cause) => new GlobIterationError({ cause }),
        });
      }),
    };
  }),
}) {}

class GlobIterationError extends Data.TaggedError('GlobIterationError')<{
  cause: unknown;
}> {}
