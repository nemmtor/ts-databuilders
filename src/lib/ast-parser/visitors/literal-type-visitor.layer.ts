import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';

export const LiteralTypeVisitorLayer = Layer.succeed(
  Visitor.LiteralTypeVisitor,
  Visitor.LiteralTypeVisitor.of({
    visit: (node: ts.LiteralTypeNode) => {
      return Effect.succeed({
        kind: node.kind,
        literal:
          'text' in node.literal ? node.literal.text : node.literal.getText(),
      });
    },
  }),
);
