import Handlebars from 'handlebars';

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

export class TemplateCompiler extends Effect.Service<TemplateCompiler>()(
  '@TSDataBuilders/TemplateCompiler',
  {
    effect: Effect.gen(function* () {
      return {
        compile: Effect.fnUntraced(function* (
          template: string,
          data?: unknown,
        ) {
          return yield* Effect.try({
            try: () => Handlebars.compile(template)(data),
            catch: (cause) => new TemplateCompileError({ cause }),
          });
        }),
      };
    }),
  },
) {}

class TemplateCompileError extends Data.TaggedError('TemplateCompileError')<{
  cause: unknown;
}> {}
