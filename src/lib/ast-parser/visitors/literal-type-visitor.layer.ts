import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';
import * as VisitorError from './visitor.errors';

export const LiteralTypeVisitorLayer = Layer.succeed(
  Visitor.LiteralTypeVisitor,
  Visitor.LiteralTypeVisitor.of({
    visit: Effect.fnUntraced(function* (node: ts.TypeNode) {
      if (!ts.isLiteralTypeKind(node.kind)) {
        return yield* new VisitorError.ExpectedDifferentSyntaxKindError({
          expected: [ts.SyntaxKind.LiteralType],
          received: node.kind,
        });
      }

      return {
        kind: node.kind,
        literal: node.getText(),
      };
    }),
  }),
);
