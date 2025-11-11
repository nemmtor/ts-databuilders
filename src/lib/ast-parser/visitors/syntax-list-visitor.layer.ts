import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';
import * as VisitorError from './visitor.errors';

export const SyntaxListVisitorLayer = Layer.succeed(
  Visitor.SyntaxListVisitor,
  Visitor.SyntaxListVisitor.of({
    visit: Effect.fnUntraced(function* (syntaxList: ts.SyntaxList) {
      const typeAliasDeclarationVisitor =
        yield* Visitor.TypeAliasDeclarationVisitor;
      const propertySignatureVisitor = yield* Visitor.PropertySignatureVisitor;

      const children = yield* Effect.try({
        try: () => syntaxList.getChildren(),
        catch: (cause) => new VisitorError.GetNodeChildrenError({ cause }),
      });

      const result: Array<Option.Option<Visitor.SyntaxList[number]>> =
        yield* Effect.all(
          children.map((node) =>
            Effect.gen(function* () {
              if (ts.isTypeAliasDeclaration(node)) {
                return yield* typeAliasDeclarationVisitor.visit(node);
              }

              if (ts.isPropertySignature(node)) {
                return yield* propertySignatureVisitor.visit(node);
              }

              // TODO: rest of visitors
              return Option.none();
            }),
          ),
          { concurrency: 'unbounded' },
        );

      return result.filter((v) => Option.isSome(v)).map((v) => v.value);
    }),
  }),
);
