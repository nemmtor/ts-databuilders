import { Option } from 'effect';

import * as Effect from 'effect/Effect';

import * as ts from '../typescript';
import * as ParseDeclarationPredicate from './parse-type-alias-declaration-predicate.tag';
import * as ParserError from './parser.error';
import * as ParserUtil from './parser.util';
import * as TypeLiteralParser from './type-literal-parser.service';

export class TypeAliasDeclarationParser extends Effect.Service<TypeAliasDeclarationParser>()(
  '@TSDataBuilders/TypeAliasDeclarationParser',
  {
    effect: Effect.gen(function* () {
      const typeLiteralParser = yield* TypeLiteralParser.TypeLiteralParser;
      const parseDeclarationPredicate =
        yield* ParseDeclarationPredicate.ParseDeclarationPredicate;

      return {
        parse: Effect.fnUntraced(function* (
          typeAliasDeclaration: ts.TypeAliasDeclaration,
        ) {
          const isExported =
            typeAliasDeclaration.modifiers?.some(
              (mod) => mod.kind === ts.SyntaxKind.ExportKeyword,
            ) ?? false;

          const jsDocTags =
            yield* ParserUtil.getJsDocTags(typeAliasDeclaration);

          if (
            !(yield* parseDeclarationPredicate({
              isExported,
              jsDocTags,
            }))
          ) {
            return Option.none();
          }

          if (!ts.isTypeLiteralNode(typeAliasDeclaration.type)) {
            return yield* new ParserError.UnsupportedTypeAliasDeclarationTypeNodeError();
          }

          const name = yield* Effect.try({
            try: () => typeAliasDeclaration.name.getText(),
            catch: (cause) =>
              new ParserError.GetTypeNodeNameTextError({ cause }),
          });

          return Option.some({
            name,
            propertySignatures: yield* typeLiteralParser.parse(
              typeAliasDeclaration.type,
            ),
            jsDocTags: yield* ParserUtil.getJsDocTags(typeAliasDeclaration),
          });
        }),
      };
    }),
    dependencies: [TypeLiteralParser.TypeLiteralParser.Default],
  },
) {}
