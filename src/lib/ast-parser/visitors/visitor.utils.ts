import * as Effect from 'effect/Effect';

import * as ts from '../../typescript/typescript';
import * as VisitorError from './visitor.errors';

export const getJsDocTagsNames = (node: ts.Node) =>
  Effect.try({
    try: () => ts.getJSDocTags(node).map((tag) => tag.tagName.getText()),
    catch: (cause) => new VisitorError.GetJsDocTagsNamesFailedError({ cause }),
  });
