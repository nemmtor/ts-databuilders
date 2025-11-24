import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as ts from '../typescript';
import * as ParseDeclarationPredicate from './parse-type-alias-declaration-predicate.tag';
import * as ParserError from './parser.error';
import * as ParserUtil from './parser.util';
import * as TypeLiteralParser from './type-literal-parser.service';

export class InterfaceDeclarationParser extends Effect.Service<InterfaceDeclarationParser>()(
  '@TSDataBuilders/InterfaceDeclarationParser',
  {
    effect: Effect.gen(function* () {
      const parseDeclarationPredicate =
        yield* ParseDeclarationPredicate.ParseDeclarationPredicate;
      const typeLiteralParser = yield* TypeLiteralParser.TypeLiteralParser;

      return {
        parse: Effect.fnUntraced(function* (
          interfaceDeclaration: ts.InterfaceDeclaration,
        ) {
          const isExported =
            interfaceDeclaration.modifiers?.some(
              (mod) => mod.kind === ts.SyntaxKind.ExportKeyword,
            ) ?? false;

          const jsDocTags =
            yield* ParserUtil.getJsDocTags(interfaceDeclaration);

          if (
            !(yield* parseDeclarationPredicate({
              isExported,
              jsDocTags,
            }))
          ) {
            return Option.none();
          }

          const name = yield* Effect.try({
            try: () => interfaceDeclaration.name.getText(),
            catch: (cause) =>
              new ParserError.GetTypeNodeNameTextError({ cause }),
          });

          return Option.some({
            name,
            propertySignatures: yield* typeLiteralParser.parseMembers(
              interfaceDeclaration.members,
              {
                onTypeLiteral: typeLiteralParser.parse,
              },
            ),
            jsDocTags: yield* ParserUtil.getJsDocTags(interfaceDeclaration),
          });
        }),
      };
    }),
    dependencies: [TypeLiteralParser.TypeLiteralParser.Default],
  },
) {}
