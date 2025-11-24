import * as Effect from 'effect/Effect';

import * as ts from '../typescript';
import * as ParserError from './parser.error';

export const getJsDocTags = (node: ts.Node) =>
  Effect.try({
    try: () =>
      ts.getJSDocTags(node).map((tag) => ({
        name: tag.tagName.getText(),
        comment: typeof tag.comment === 'string' ? tag.comment : undefined,
      })),
    catch: (cause) => new ParserError.GetJsDocTagsNamesError({ cause }),
  });
