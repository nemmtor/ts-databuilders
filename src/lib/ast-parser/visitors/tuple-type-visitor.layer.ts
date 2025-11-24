import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';

export const TupleTypeVisitorLayer = Layer.succeed(
  Visitor.TupleTypeVisitor,
  Visitor.TupleTypeVisitor.of({
    visit: Effect.fnUntraced(function* (node: ts.TupleTypeNode) {
      const typeNodeVisitor = yield* Visitor.TypeNodeVisitor;
      return {
        kind: ts.SyntaxKind.TupleType,
        elements: (yield* Effect.all(
          node.elements.map((element) => typeNodeVisitor.visit(element)),
          { concurrency: 'unbounded' },
        ))
          .filter((v) => Option.isSome(v))
          .map((v) => v.value),
      };
    }),
  }),
);
