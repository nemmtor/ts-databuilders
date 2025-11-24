import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';

export const TypeLiteralVisitorLayer = Layer.succeed(
  Visitor.TypeLiteralVisitor,
  Visitor.TypeLiteralVisitor.of({
    visit: Effect.fnUntraced(function* (typeLiteralNode: ts.TypeLiteralNode) {
      const propertySignatureVisitor = yield* Visitor.PropertySignatureVisitor;

      const members = yield* Effect.all(
        typeLiteralNode.members.map((child) =>
          Effect.gen(function* () {
            if (ts.isPropertySignature(child)) {
              return yield* propertySignatureVisitor.visit(child);
            }

            return Option.none<Visitor.TypeLiteral['members'][number]>();
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
