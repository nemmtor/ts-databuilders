import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as ts from '../typescript';
import * as TypeAliasDeclarationVisitor from './type-alias-declaration-visitor.service';
import * as VisitorError from './visitor.errors';

export class SyntaxListVisitor extends Effect.Service<SyntaxListVisitor>()(
  '@TSDataBuilders/ASTParser/SyntaxListVisitor',
  {
    effect: Effect.gen(function* () {
      yield* Effect.logDebug('Instantiating SyntaxListVisitor service');
      const typeAliasDeclarationVisitor =
        yield* TypeAliasDeclarationVisitor.TypeAliasDeclarationVisitor;

      const visit = Effect.fnUntraced(function* (syntaxList: ts.SyntaxList) {
        const syntaxListNodes = yield* Effect.try({
          try: () => syntaxList.getChildren(),
          catch: (cause) => new VisitorError.GetNodeChildrenError({ cause }),
        });

        const result = yield* Effect.all(
          syntaxListNodes.map((node) =>
            Effect.gen(function* () {
              if (ts.isTypeAliasDeclaration(node)) {
                return Option.some<void>(
                  yield* typeAliasDeclarationVisitor.visit(node),
                );
              }

              // TODO: rest of visitors
              return Option.none<void>();
            }),
          ),
          { concurrency: 'unbounded' },
        );

        return result.filter((v) => Option.isSome(v)).map((v) => v.value);
      });

      return {
        visit,
      };
    }),
    dependencies: [
      TypeAliasDeclarationVisitor.TypeAliasDeclarationVisitor.Default,
    ],
  },
) {}
