import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as ts from '../typescript';
import * as TypescriptProgram from '../typescript-program';
import * as ParserError from './parser.error';
import type * as ParserType from './parser.type';
import * as ParserUtil from './parser.util';

export class TypeNodeParser extends Effect.Service<TypeNodeParser>()(
  '@TSDataBuilders/TypeNodeParser',
  {
    effect: Effect.gen(function* () {
      yield* Effect.logDebug('[TypeNodeParser]: Instantiating');
      const typescriptProgram = yield* TypescriptProgram.TypescriptProgram;
      const printer = ts.createPrinter();
      const tempSourceFile = yield* typescriptProgram.createSourceFile({
        fileName: 'temp.ts',
        sourceText: '',
      });

      const resolveNodeSynthetically = Effect.fnUntraced(function* (opts: {
        type: ts.Type;
        typeNode: ts.TypeNode;
        onTypeLiteral: (
          typeLiteralNode: ts.TypeLiteralNode,
        ) => Effect.Effect<
          ParserType.PropertySignature[],
          ParserError.TypeLiteralParserError
        >;
      }) {
        const syntheticTypeNode = typescriptProgram.typeChecker.typeToTypeNode(
          opts.type,
          opts.typeNode,
          ts.NodeBuilderFlags.InTypeAlias | ts.NodeBuilderFlags.NoTruncation,
        );

        if (!syntheticTypeNode) {
          return yield* new ParserError.CannotCreateSyntheticTypeNodeError();
        }

        return yield* parseTypeNode(syntheticTypeNode, {
          onTypeLiteral: opts.onTypeLiteral,
        });
      });

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

        if (typeNode.kind === ts.SyntaxKind.ObjectKeyword) {
          return {
            kind: 'TypeLiteral' as const,
            propertySignatures: [],
          };
        }

        if (ts.isLiteralType(typeNode)) {
          const isSynthetic =
            typeNode.pos === -1 || typeNode.getSourceFile() === undefined;
          return {
            kind: 'LiteralType' as const,
            literal: yield* Effect.try({
              try: () =>
                isSynthetic
                  ? printer.printNode(
                      ts.EmitHint.Unspecified,
                      typeNode,
                      tempSourceFile,
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
              jsDocTags: [],
            };
          }

          // Handle utility types with conditionals - resolve synthetically
          const syntheticUtilityTypes = [
            'Awaited',
            'Exclude',
            'Extract',
            'ReturnType',
            'Parameters',
            'ConstructorParameters',
            'InstanceType',
          ];
          if (syntheticUtilityTypes.includes(referenceName)) {
            const type =
              typescriptProgram.typeChecker.getTypeAtLocation(typeNode);
            return yield* resolveNodeSynthetically({
              type,
              typeNode,
              onTypeLiteral: opts.onTypeLiteral,
            });
          }

          const type =
            typescriptProgram.typeChecker.getTypeAtLocation(typeNode);

          // TODO: this is a weird workaround, find better solution
          // Check if type is object-like (interface/type alias with properties)
          // Skip for union types - they have inherited properties (e.g., string methods)
          // but should be resolved synthetically instead
          const properties = type.getProperties();

          if (properties.length > 0 && !type.isUnion()) {
            // Build TypeLiteral from properties directly
            const propertySignatures = yield* Effect.all(
              properties.map(
                Effect.fn(function* (prop) {
                  const propType =
                    typescriptProgram.typeChecker.getTypeOfSymbol(prop);
                  const parsedTypeNode = yield* resolveNodeSynthetically({
                    type: propType,
                    typeNode,
                    onTypeLiteral: opts.onTypeLiteral,
                  });

                  return {
                    name: prop.getName(),
                    typeNode: parsedTypeNode,
                    hasQuestionToken: Boolean(
                      prop.flags & ts.SymbolFlags.Optional,
                    ),
                    jsDocTags: [],
                  };
                }),
              ),
              { concurrency: 'unbounded' },
            );

            const inlineType: ParserType.TypeLiteral = {
              kind: 'TypeLiteral',
              propertySignatures,
            };

            const symbol = type.aliasSymbol ?? type.getSymbol();
            const declaration = symbol?.declarations?.[0];
            const jsDocTags = declaration
              ? yield* ParserUtil.getJsDocTags(declaration)
              : [];

            return {
              kind: 'TypeReference' as const,
              referenceName,
              inlineType: Option.some(inlineType),
              jsDocTags,
            };
          }

          // Fallback to synthetic node for non-object types
          const syntheticTypeNode =
            typescriptProgram.typeChecker.typeToTypeNode(
              type,
              typeNode,
              ts.NodeBuilderFlags.InTypeAlias |
                ts.NodeBuilderFlags.NoTruncation,
            );

          if (!syntheticTypeNode) {
            return yield* new ParserError.CannotCreateSyntheticTypeNodeError();
          }

          const inlineType = yield* parseTypeNode(syntheticTypeNode, opts);

          return {
            kind: 'TypeReference' as const,
            referenceName,
            inlineType: Option.some(inlineType),
            jsDocTags: [],
          };
        }

        if (ts.isTypeOperatorNode(typeNode)) {
          if (typeNode.operator === ts.SyntaxKind.KeyOfKeyword) {
            const type =
              typescriptProgram.typeChecker.getTypeAtLocation(typeNode);
            return yield* resolveNodeSynthetically({
              type,
              typeNode,
              onTypeLiteral: opts.onTypeLiteral,
            });
          }
          if (typeNode.operator === ts.SyntaxKind.ReadonlyKeyword) {
            return yield* parseTypeNode(typeNode.type, opts);
          }
        }

        if (ts.isTypeQueryNode(typeNode)) {
          const type =
            typescriptProgram.typeChecker.getTypeAtLocation(typeNode);
          return yield* resolveNodeSynthetically({
            type,
            typeNode,
            onTypeLiteral: opts.onTypeLiteral,
          });
        }

        if (ts.isIndexedAccessTypeNode(typeNode)) {
          const type =
            typescriptProgram.typeChecker.getTypeAtLocation(typeNode);
          return yield* resolveNodeSynthetically({
            type,
            typeNode,
            onTypeLiteral: opts.onTypeLiteral,
          });
        }

        if (ts.isMappedTypeNode(typeNode)) {
          const type =
            typescriptProgram.typeChecker.getTypeAtLocation(typeNode);
          return yield* resolveNodeSynthetically({
            type,
            typeNode,
            onTypeLiteral: opts.onTypeLiteral,
          });
        }

        if (ts.isIntersectionTypeNode(typeNode)) {
          return {
            kind: 'IntersectionType' as const,
            members: yield* Effect.all(
              typeNode.types.map((type) => parseTypeNode(type, opts)),
              { concurrency: 'unbounded' },
            ),
          };
        }

        if (ts.isTemplateLiteralTypeNode(typeNode)) {
          const headText = yield* Effect.try({
            try: () => typeNode.head.text,
            catch: (cause) => new ParserError.CannotGetNodeTextError({ cause }),
          });
          const spanTexts = yield* Effect.all(
            typeNode.templateSpans.map((span) =>
              Effect.try({
                try: () => span.literal.text,
                catch: (cause) =>
                  new ParserError.CannotGetNodeTextError({ cause }),
              }),
            ),
            { concurrency: 'unbounded' },
          );
          const fullText = headText + spanTexts.join('');
          return {
            kind: 'LiteralType' as const,
            literal: `'${fullText}'`,
          };
        }

        if (ts.isOptionalTypeNode(typeNode)) {
          return yield* parseTypeNode(typeNode.type, opts);
        }

        if (ts.isParenthesizedTypeNode(typeNode)) {
          return yield* parseTypeNode(typeNode.type, opts);
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
