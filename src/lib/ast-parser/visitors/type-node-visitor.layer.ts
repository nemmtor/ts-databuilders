import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';

export const TypeNodeVisitorLayer = Layer.succeed(
  Visitor.TypeNodeVisitor,
  Visitor.TypeNodeVisitor.of({
    visit: Effect.fnUntraced(function* (typeNode: ts.TypeNode) {
      const primitiveKeywordVisitor = yield* Visitor.PrimitiveKeywordVisitor;
      const literalTypeVisitor = yield* Visitor.LiteralTypeVisitor;
      const opaqueBuiltinTypeVisitor = yield* Visitor.BuiltinOpaqueTypeVisitor;
      const arrayTypeVisitor = yield* Visitor.ArrayTypeVisitor;
      const typeLiteralVisitor = yield* Visitor.TypeLiteralVisitor;
      const unionTypeVisitor = yield* Visitor.UnionTypeVisitor;

      if (ts.isPrimitiveKeywordSyntaxKind(typeNode.kind)) {
        return Option.some<Visitor.TypeNode>(
          yield* primitiveKeywordVisitor.visit(typeNode),
        );
      }

      if (ts.isLiteralTypeKind(typeNode.kind)) {
        return Option.some<Visitor.TypeNode>(
          yield* literalTypeVisitor.visit(typeNode),
        );
      }

      if (
        ts.isTypeReferenceNode(typeNode) &&
        ts.isBuiltinOpaqueType(typeNode)
      ) {
        return Option.some<Visitor.TypeNode>(
          yield* opaqueBuiltinTypeVisitor.visit(typeNode),
        );
      }

      if (ts.isArrayTypeNode(typeNode)) {
        return Option.some<Visitor.TypeNode>(
          yield* arrayTypeVisitor.visit(typeNode),
        );
      }

      if (ts.isTypeLiteralNode(typeNode)) {
        return Option.some<Visitor.TypeNode>(
          yield* typeLiteralVisitor.visit(typeNode),
        );
      }

      if (ts.isUnionTypeNode(typeNode)) {
        return Option.some<Visitor.TypeNode>(
          yield* unionTypeVisitor.visit(typeNode),
        );
      }

      return Option.none<Visitor.TypeNode>();
    }),
  }),
);
