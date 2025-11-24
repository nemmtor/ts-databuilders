import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

export class Process extends Effect.Service<Process>()(
  '@TSDataBuilders/Process',
  {
    effect: Effect.gen(function* () {
      yield* Effect.logDebug('[Process]: Instantiating');

      return {
        cwd: Effect.try({
          try: () => process.cwd(),
          catch: (cause) => new GetProcessCwdError({ cause }),
        }),
      };
    }),
  },
) {}

class GetProcessCwdError extends Data.TaggedError('GetProcessCwdError')<{
  cause: unknown;
}> {}
