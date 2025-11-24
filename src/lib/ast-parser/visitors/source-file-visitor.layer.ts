import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';
import * as VisitorError from './visitor.errors';

export const SourceFileVisitorLayer = Layer.succeed(
  Visitor.SourceFileVisitor,
  Visitor.SourceFileVisitor.of({
    visit: Effect.fnUntraced(function* (sourceFile: ts.SourceFile) {
      const syntaxListVisitor = yield* Visitor.SyntaxListVisitor;
      const fileNodes = yield* Effect.try({
        try: () => sourceFile.getChildren(),
        catch: (cause) => new VisitorError.GetNodeChildrenError({ cause }),
      });
      const syntaxListNode = fileNodes.find(ts.isSyntaxList);
      if (!syntaxListNode) {
        return yield* new VisitorError.MissingSyntaxListNodeInSourceFileError();
      }

      return {
        fileName: sourceFile.fileName,
        declarations: yield* syntaxListVisitor.visit(syntaxListNode),
      };
    }),
  }),
);
