import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';
import * as VisitorError from './visitor.errors';

export const PrimitiveKeywordVisitorLayer = Layer.succeed(
  Visitor.PrimitiveKeywordVisitor,
  Visitor.PrimitiveKeywordVisitor.of({
    visit: Effect.fnUntraced(function* (node: ts.Node) {
      if (!ts.isPrimitiveKeywordSyntaxKind(node.kind)) {
        return yield* new VisitorError.ExpectedDifferentSyntaxKindError({
          expected: ts.PRIMITIVE_KEYWORD_SYNTAX_KINDS,
          received: node.kind,
        });
      }

      return {
        kind: node.kind,
      };
    }),
  }),
);
