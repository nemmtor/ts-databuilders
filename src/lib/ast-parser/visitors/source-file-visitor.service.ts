import * as Effect from 'effect/Effect';

import * as ts from '../typescript';
import * as SyntaxListVisitor from './syntax-list-visitor.service';
import * as TypeAliasDeclarationVisitor from './type-alias-declaration-visitor.service';
import * as VisitorError from './visitor.errors';

export class SourceFileVisitor extends Effect.Service<SourceFileVisitor>()(
  '@TSDataBuilders/ASTParser/SourceFileVisitor',
  {
    effect: Effect.gen(function* () {
      yield* Effect.logDebug('Instantiating SourceFileVisitor service');
      const syntaxListVisitor = yield* SyntaxListVisitor.SyntaxListVisitor;

      const visit = Effect.fnUntraced(function* (sourceFile: ts.SourceFile) {
        const fileNodes = yield* Effect.try({
          try: () => sourceFile.getChildren(),
          catch: (cause) => new VisitorError.GetNodeChildrenError({ cause }),
        });
        const syntaxListNode = fileNodes.find(
          (node): node is ts.SyntaxList =>
            node.kind === ts.SyntaxKind.SyntaxList,
        );
        if (!syntaxListNode) {
          return yield* new VisitorError.MissingSyntaxListNodeInSourceFileError();
        }

        return yield* syntaxListVisitor.visit(syntaxListNode);
      });

      return {
        visit,
      };
    }),
    dependencies: [
      TypeAliasDeclarationVisitor.TypeAliasDeclarationVisitor.Default,
      SyntaxListVisitor.SyntaxListVisitor.Default,
    ],
  },
) {}
