import * as Effect from 'effect/Effect';

import * as ts from '../typescript';
import * as ParserError from './parser.error';

export const getJsDocTagsNames = (node: ts.Node) =>
  Effect.try({
    try: () => ts.getJSDocTags(node).map((tag) => tag.tagName.getText()),
    catch: (cause) => new ParserError.GetJsDocTagsNamesError({ cause }),
  });
