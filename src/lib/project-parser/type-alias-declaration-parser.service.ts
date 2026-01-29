import { Option } from 'effect';

import * as Effect from 'effect/Effect';

import * as ts from '../typescript';
import * as TypescriptProgram from '../typescript-program';
import * as ParseDeclarationPredicate from './parse-type-alias-declaration-predicate.tag';
import * as ParserError from './parser.error';
import * as ParserUtil from './parser.util';
import * as TypeLiteralParser from './type-literal-parser.service';
import * as TypeNodeParser from './type-node-parser.service';

export class TypeAliasDeclarationParser extends Effect.Service<TypeAliasDeclarationParser>()(
  '@TSDataBuilders/TypeAliasDeclarationParser',
  {
    effect: Effect.gen(function* () {
      const typeLiteralParser = yield* TypeLiteralParser.TypeLiteralParser;
      const typeNodeParser = yield* TypeNodeParser.TypeNodeParser;
      const typescriptProgram = yield* TypescriptProgram.TypescriptProgram;
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

          const name = yield* Effect.try({
            try: () => typeAliasDeclaration.name.getText(),
            catch: (cause) =>
              new ParserError.GetTypeNodeNameTextError({ cause }),
          });

          if (ts.isTypeLiteralNode(typeAliasDeclaration.type)) {
            return Option.some({
              name,
              propertySignatures: yield* typeLiteralParser.parse(
                typeAliasDeclaration.type,
              ),
              jsDocTags: yield* ParserUtil.getJsDocTags(typeAliasDeclaration),
            });
          }

          // TODO: figure out if this can be abstracted since it feels like it is reused across different places
          if (
            ts.isIntersectionTypeNode(typeAliasDeclaration.type) ||
            ts.isTypeReferenceNode(typeAliasDeclaration.type)
          ) {
            const type = typescriptProgram.typeChecker.getTypeAtLocation(
              typeAliasDeclaration.type,
            );
            const properties = type.getProperties();

            const propertySignatures = yield* Effect.all(
              properties.map(
                Effect.fn(function* (prop) {
                  const propType =
                    typescriptProgram.typeChecker.getTypeOfSymbol(prop);
                  const syntheticTypeNode =
                    typescriptProgram.typeChecker.typeToTypeNode(
                      propType,
                      typeAliasDeclaration.type,
                      ts.NodeBuilderFlags.InTypeAlias |
                        ts.NodeBuilderFlags.NoTruncation,
                    );

                  if (!syntheticTypeNode) {
                    return yield* new ParserError.CannotCreateSyntheticTypeNodeError();
                  }

                  const typeNode = yield* typeNodeParser.parse(
                    syntheticTypeNode,
                    { onTypeLiteral: typeLiteralParser.parse },
                  );

                  return {
                    name: prop.getName(),
                    typeNode,
                    hasQuestionToken: Boolean(
                      prop.flags & ts.SymbolFlags.Optional,
                    ),
                    jsDocTags: [],
                  };
                }),
              ),
              { concurrency: 'unbounded' },
            );

            return Option.some({
              name,
              propertySignatures,
              jsDocTags: yield* ParserUtil.getJsDocTags(typeAliasDeclaration),
            });
          }

          return yield* new ParserError.UnsupportedTypeAliasDeclarationTypeNodeError();
        }),
      };
    }),
    dependencies: [
      TypeLiteralParser.TypeLiteralParser.Default,
      TypeNodeParser.TypeNodeParser.Default,
      TypescriptProgram.TypescriptProgram.Default,
    ],
  },
) {}
