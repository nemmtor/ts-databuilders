import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';

export const UnionTypeVisitorLayer = Layer.succeed(
  Visitor.UnionTypeVisitor,
  Visitor.UnionTypeVisitor.of({
    visit: Effect.fnUntraced(function* (node: ts.UnionTypeNode) {
      const typeNodeVisitor = yield* Visitor.TypeNodeVisitor;
      return {
        kind: ts.SyntaxKind.UnionType,
        types: (yield* Effect.all(
          node.types.map((type) => typeNodeVisitor.visit(type)),
          { concurrency: 'unbounded' },
        ))
          .filter((v) => Option.isSome(v))
          .map((v) => v.value)
          // this should not be possible, it would mean that union has another union inside of it
          .filter((v) => v.kind !== ts.SyntaxKind.UnionType),
      };
    }),
  }),
);
