import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

export class ParseTypeAliasDeclarationPredicate extends Context.Tag(
  '@TSDataBuilders/ParseTypeAliasDeclarationPredicate',
)<
  ParseTypeAliasDeclarationPredicate,
  (opts: {
    isExported: boolean;
    jsDocTagNames: string[];
  }) => Effect.Effect<boolean>
>() {}
