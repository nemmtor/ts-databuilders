import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as ts from '../typescript';
import * as ParseTypeAliasDeclarationPredicate from './parse-type-alias-declaration-predicate.tag';
import * as ParserError from './parser.error';
import * as ParserUtil from './parser.util';
import * as TypeLiteralParser from './type-literal-parser.service';

export class InterfaceDeclarationParser extends Effect.Service<InterfaceDeclarationParser>()(
  '@TSDataBuilders/InterfaceDeclarationParser',
  {
    effect: Effect.gen(function* () {
      const parseTypeAliasDeclarationPredicate =
        yield* ParseTypeAliasDeclarationPredicate.ParseTypeAliasDeclarationPredicate;
      const typeLiteralParser = yield* TypeLiteralParser.TypeLiteralParser;

      return {
        parse: Effect.fnUntraced(function* (
          interfaceDeclaration: ts.InterfaceDeclaration,
        ) {
          const isExported =
            interfaceDeclaration.modifiers?.some(
              (mod) => mod.kind === ts.SyntaxKind.ExportKeyword,
            ) ?? false;

          const jsDocTagNames =
            yield* ParserUtil.getJsDocTagsNames(interfaceDeclaration);

          if (
            // TODO: diff name for this fn as it also covers interfaces check
            !(yield* parseTypeAliasDeclarationPredicate({
              isExported,
              jsDocTagNames,
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
            jsDocTagNames:
              yield* ParserUtil.getJsDocTagsNames(interfaceDeclaration),
          });
        }),
      };
    }),
    dependencies: [TypeLiteralParser.TypeLiteralParser.Default],
  },
) {}
