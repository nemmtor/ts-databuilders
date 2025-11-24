import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

export class ParseDeclarationPredicate extends Context.Tag(
  '@TSDataBuilders/ParseDeclarationPredicate',
)<
  ParseDeclarationPredicate,
  (opts: {
    isExported: boolean;
    jsDocTagNames: string[];
  }) => Effect.Effect<boolean>
>() {}
