import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';
import * as VisitorError from './visitor.errors';

export const TypeLiteralVisitorLayer = Layer.succeed(
  Visitor.TypeLiteralVisitor,
  Visitor.TypeLiteralVisitor.of({
    visit: Effect.fnUntraced(function* (typeLiteralNode: ts.TypeLiteralNode) {
      const syntaxListVisitor = yield* Visitor.SyntaxListVisitor;
      const children = yield* Effect.try({
        try: () => typeLiteralNode.getChildren(),
        catch: (cause) => new VisitorError.GetNodeChildrenError({ cause }),
      });

      const members = yield* Effect.all(
        children.map((child) =>
          Effect.gen(function* () {
            if (ts.isSyntaxList(child)) {
              return Option.some<Visitor.SyntaxList>(
                yield* syntaxListVisitor.visit(child),
              );
            }
            return Option.none<Visitor.SyntaxList>();
          }),
        ),
        { concurrency: 'unbounded' },
      );

      return {
        kind: ts.SyntaxKind.TypeLiteral,
        members: members.flatMap((member) =>
          member.pipe(Option.getOrElse(() => [])),
        ),
      };
    }),
  }),
);
