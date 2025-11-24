import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';
import * as VisitorUtil from './visitor.utils';

export const TypeAliasDeclarationVisitorLayer = Layer.succeed(
  Visitor.TypeAliasDeclarationVisitor,
  Visitor.TypeAliasDeclarationVisitor.of({
    visit: Effect.fnUntraced(function* (node: ts.TypeAliasDeclaration) {
      const typeLiteralVisitor = yield* Visitor.TypeLiteralVisitor;
      const name = node.name.getText();

      if (ts.isTypeLiteralNode(node.type)) {
        const typeLiteral = yield* typeLiteralVisitor.visit(node.type);
        return Option.some<Visitor.TypeAliasDeclaration>({
          kind: ts.SyntaxKind.TypeAliasDeclaration,
          name,
          type: typeLiteral,
          jsDocTagsNames: yield* VisitorUtil.getJsDocTagsNames(node),
        });
      }

      return Option.none<Visitor.TypeAliasDeclaration>();
    }),
  }),
);
