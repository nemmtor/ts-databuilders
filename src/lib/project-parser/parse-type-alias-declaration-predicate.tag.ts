import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import type * as Parser from './parser.type';

export class ParseDeclarationPredicate extends Context.Tag(
  '@TSDataBuilders/ParseDeclarationPredicate',
)<
  ParseDeclarationPredicate,
  (opts: {
    isExported: boolean;
    jsDocTags: Parser.JsDocTag[];
  }) => Effect.Effect<boolean>
>() {}
