import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as ts from '../typescript';
import * as InterfaceDeclarationParser from './interface-declaration-parser.service';
import * as ParserError from './parser.error';
import * as TypeAliasDeclarationParser from './type-alias-declaration-parser.service';

export class SyntaxListParser extends Effect.Service<SyntaxListParser>()(
  '@TSDataBuilders/SyntaxListParser',
  {
    effect: Effect.gen(function* () {
      const typeAliasDeclarationParser =
        yield* TypeAliasDeclarationParser.TypeAliasDeclarationParser;
      const interfaceDeclarationParser =
        yield* InterfaceDeclarationParser.InterfaceDeclarationParser;

      return {
        parse: Effect.fnUntraced(function* (syntaxList: ts.SyntaxList) {
          const children = yield* Effect.try({
            try: () => syntaxList.getChildren(),
            catch: (cause) => new ParserError.GetNodeChildrenError({ cause }),
          });

          const results = yield* Effect.all(
            children.map(
              Effect.fnUntraced(function* (node) {
                if (ts.isTypeAliasDeclaration(node)) {
                  return yield* typeAliasDeclarationParser.parse(node);
                }

                if (ts.isInterfaceDeclaration(node)) {
                  return yield* interfaceDeclarationParser.parse(node);
                }

                return Option.none();
              }),
            ),
            { concurrency: 'unbounded' },
          );

          return results.filter((v) => Option.isSome(v)).map((v) => v.value);
        }),
      };
    }),
    dependencies: [
      InterfaceDeclarationParser.InterfaceDeclarationParser.Default,
      TypeAliasDeclarationParser.TypeAliasDeclarationParser.Default,
    ],
  },
) {}
