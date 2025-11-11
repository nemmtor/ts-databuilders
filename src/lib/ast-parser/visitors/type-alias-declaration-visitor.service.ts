import * as Effect from 'effect/Effect';

import * as ts from '../typescript';
import * as TypeLiteralVisitor from './type-literal-visitor.service';

export class TypeAliasDeclarationVisitor extends Effect.Service<TypeAliasDeclarationVisitor>()(
  '@TSDataBuilders/ASTParser/TypeAliasDeclarationVisitor',
  {
    effect: Effect.gen(function* () {
      yield* Effect.logDebug(
        'Instantiating TypeAliasDeclarationVisitor service',
      );
      const typeLiteralVisitor = yield* TypeLiteralVisitor.TypeLiteralVisitor;

      return {
        visit: Effect.fnUntraced(function* (node: ts.TypeAliasDeclaration) {
          if (ts.isTypeLiteralNode(node.type)) {
            return yield* typeLiteralVisitor.visit(node.type);
          }

          console.log({ typeDeclKind: node.type.kind });
        }),
      };
    }),
    dependencies: [TypeLiteralVisitor.TypeLiteralVisitor.Default],
  },
) {}
