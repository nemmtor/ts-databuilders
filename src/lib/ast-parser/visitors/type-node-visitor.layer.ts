import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import * as ts from '../../typescript/typescript';
import * as TypescriptProject from '../../typescript/typescript-project.layer';
import * as Visitor from './visitor';
import * as VisitorError from './visitor.errors';

export const TypeNodeVisitorLayer = Layer.succeed(
  Visitor.TypeNodeVisitor,
  Visitor.TypeNodeVisitor.of({
    visit: Effect.fnUntraced(function* (typeNode: ts.Node) {
      const primitiveKeywordVisitor = yield* Visitor.PrimitiveKeywordVisitor;
      const literalTypeVisitor = yield* Visitor.LiteralTypeVisitor;
      const opaqueBuiltinTypeVisitor = yield* Visitor.BuiltinOpaqueTypeVisitor;
      const arrayTypeVisitor = yield* Visitor.ArrayTypeVisitor;
      const typeLiteralVisitor = yield* Visitor.TypeLiteralVisitor;
      const unionTypeVisitor = yield* Visitor.UnionTypeVisitor;
      const typeNodeVisitor = yield* Visitor.TypeNodeVisitor;
      const typescriptProject = yield* TypescriptProject.TypescriptProject;

      if (ts.isPrimitiveKeywordSyntaxKind(typeNode.kind)) {
        return Option.some<Visitor.TypeNode>(
          yield* primitiveKeywordVisitor.visit(typeNode),
        );
      }

      if (ts.isLiteralTypeNode(typeNode)) {
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

      if (ts.isTypeReferenceNode(typeNode)) {
        const type = typescriptProject.typeChecker.getTypeAtLocation(typeNode);
        const syntheticTypeNode = typescriptProject.typeChecker.typeToTypeNode(
          type,
          typeNode,
          ts.NodeBuilderFlags.InTypeAlias | ts.NodeBuilderFlags.NoTruncation,
        );

        if (!syntheticTypeNode) {
          return yield* new VisitorError.CannotCreateSyntheticTypeNodeError();
        }

        const inlineType = yield* typeNodeVisitor.visit(syntheticTypeNode);
        if (Option.isNone(inlineType)) {
          return Option.none<Visitor.TypeNode>();
        }

        return Option.some<Visitor.TypeNode>({
          kind: ts.SyntaxKind.TypeReference,
          inlineType: inlineType.value,
          referenceName: typeNode.typeName.getText(),
        });
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
