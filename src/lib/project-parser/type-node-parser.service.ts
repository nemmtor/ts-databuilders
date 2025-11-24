import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as ts from '../typescript-2';
import * as TypescriptProgram from '../typescript-program';
import * as ParserError from './parser.error';
import type * as ParserType from './parser.type';

export class TypeNodeParser extends Effect.Service<TypeNodeParser>()(
  '@TSDataBuilders/TypeNodeParser',
  {
    effect: Effect.gen(function* () {
      yield* Effect.logDebug('[TypeNodeParser]: Instantiating');
      const typescriptProgram = yield* TypescriptProgram.TypescriptProgram;
      const { typeChecker } = typescriptProgram;
      const printer = ts.createPrinter();
      const sourceFile = typescriptProgram.program.getSourceFile(
        typescriptProgram.program.getRootFileNames()[0],
      );
      const parseTypeNode: (
        typeNode: ts.TypeNode,
        opts: {
          onTypeLiteral: (
            typeLiteralNode: ts.TypeLiteralNode,
          ) => Effect.Effect<
            ParserType.PropertySignature[],
            ParserError.TypeLiteralParserError
          >;
        },
      ) => Effect.Effect<
        ParserType.TypeNode,
        ParserError.TypeLiteralParserError
      > = Effect.fnUntraced(function* (typeNode, opts) {
        if (typeNode.kind === ts.SyntaxKind.StringKeyword) {
          return {
            kind: 'StringKeyword' as const,
          };
        }

        if (typeNode.kind === ts.SyntaxKind.NumberKeyword) {
          return {
            kind: 'NumberKeyword' as const,
          };
        }

        if (typeNode.kind === ts.SyntaxKind.BooleanKeyword) {
          return {
            kind: 'BooleanKeyword' as const,
          };
        }

        if (typeNode.kind === ts.SyntaxKind.UndefinedKeyword) {
          return {
            kind: 'UndefinedKeyword' as const,
          };
        }

        if (typeNode.kind === ts.SyntaxKind.BigIntKeyword) {
          return {
            kind: 'BigIntKeyword' as const,
          };
        }

        if (typeNode.kind === ts.SyntaxKind.SymbolKeyword) {
          return {
            kind: 'SymbolKeyword' as const,
          };
        }

        if (typeNode.kind === ts.SyntaxKind.AnyKeyword) {
          return {
            kind: 'AnyKeyword' as const,
          };
        }

        if (typeNode.kind === ts.SyntaxKind.UnknownKeyword) {
          return {
            kind: 'UnknownKeyword' as const,
          };
        }

        if (typeNode.kind === ts.SyntaxKind.NeverKeyword) {
          return {
            kind: 'NeverKeyword' as const,
          };
        }

        if (ts.isLiteralType(typeNode)) {
          return {
            kind: 'LiteralType' as const,
            literal: yield* Effect.try({
              try: () =>
                typeNode.pos === -1
                  ? printer.printNode(
                      ts.EmitHint.Unspecified,
                      typeNode,
                      sourceFile,
                    )
                  : typeNode.getText(),
              catch: (cause) =>
                new ParserError.CannotGetNodeTextError({ cause }),
            }),
          };
        }

        if (ts.isTypeLiteralNode(typeNode)) {
          return {
            kind: 'TypeLiteral' as const,
            propertySignatures: yield* opts.onTypeLiteral(typeNode),
          };
        }

        if (ts.isArrayTypeNode(typeNode)) {
          return {
            kind: 'ArrayType' as const,
          };
        }

        if (ts.isTupleTypeNode(typeNode)) {
          const elements = yield* Effect.all(
            typeNode.elements
              .filter(
                (element) =>
                  !(ts.isNamedTupleMember(element) && element.dotDotDotToken),
              )
              .map((element) => parseTypeNode(element, opts)),
            { concurrency: 'unbounded' },
          );
          return {
            kind: 'TupleType' as const,
            elements,
          };
        }

        if (ts.isNamedTupleMember(typeNode)) {
          return yield* parseTypeNode(typeNode.type, opts);
        }

        if (ts.isUnionTypeNode(typeNode)) {
          return {
            kind: 'UnionType' as const,
            members: yield* Effect.all(
              typeNode.types.map((type) => parseTypeNode(type, opts)),
              { concurrency: 'unbounded' },
            ),
          };
        }

        if (ts.isTypeReferenceNode(typeNode)) {
          const referenceName = yield* Effect.try({
            try: () =>
              'escapedText' in typeNode.typeName
                ? typeNode.typeName.escapedText.toString()
                : typeNode.typeName.getText(),
            catch: (cause) => new ParserError.CannotGetNodeTextError({ cause }),
          });

          // Check if built-in type - don't inline
          if (ts.isBuiltinOpaqueType(referenceName)) {
            return {
              kind: 'TypeReference' as const,
              referenceName,
              inlineType: Option.none(),
            };
          }

          const type = typeChecker.getTypeAtLocation(typeNode);

          // Check if type is object-like (interface/type alias with properties)
          const properties = type.getProperties();

          if (properties.length > 0) {
            // Build TypeLiteral from properties directly
            const propertySignatures = yield* Effect.all(
              properties.map((prop) =>
                Effect.gen(function* () {
                  const propType = typeChecker.getTypeOfSymbol(prop);
                  const propTypeNode = typeChecker.typeToTypeNode(
                    propType,
                    typeNode,
                    ts.NodeBuilderFlags.InTypeAlias |
                      ts.NodeBuilderFlags.NoTruncation,
                  );

                  if (!propTypeNode) {
                    return yield* new ParserError.CannotCreateSyntheticTypeNodeError();
                  }

                  const parsedTypeNode = yield* parseTypeNode(
                    propTypeNode,
                    opts,
                  );

                  return {
                    name: prop.getName(),
                    typeNode: parsedTypeNode,
                    hasQuestionToken: Boolean(
                      prop.flags & ts.SymbolFlags.Optional,
                    ),
                    jsDocTagNames: [],
                  };
                }),
              ),
              { concurrency: 'unbounded' },
            );

            const inlineType: ParserType.TypeLiteral = {
              kind: 'TypeLiteral',
              propertySignatures,
            };

            return {
              kind: 'TypeReference' as const,
              referenceName,
              inlineType: Option.some(inlineType),
            };
          }

          // Fallback to synthetic node for non-object types
          const syntheticTypeNode = typeChecker.typeToTypeNode(
            type,
            typeNode,
            ts.NodeBuilderFlags.InTypeAlias |
              ts.NodeBuilderFlags.NoTruncation |
              ts.NodeBuilderFlags.IgnoreErrors,
          );

          if (!syntheticTypeNode) {
            return yield* new ParserError.CannotCreateSyntheticTypeNodeError();
          }

          const inlineType = yield* parseTypeNode(syntheticTypeNode, opts);

          return {
            kind: 'TypeReference' as const,
            referenceName,
            inlineType: Option.some(inlineType),
          };
        }

        return yield* new ParserError.UnsupportedTypeNodeError({
          kind: ts.SyntaxKind[typeNode.kind],
        });
      });

      return {
        parse: parseTypeNode,
      };
    }),
    dependencies: [TypescriptProgram.TypescriptProgram.Default],
  },
) {}
