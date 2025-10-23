import { randomUUID } from 'node:crypto';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import { Node, SyntaxKind, type Type, type TypeNode } from 'ts-morph';
import { Configuration } from '../configuration';

export class TypeNodeParser extends Effect.Service<TypeNodeParser>()(
  '@TSDataBuilders/TypeNodeParser',
  {
    effect: Effect.gen(function* () {
      const { jsdocTag } = yield* Configuration;

      const resolveObjectTypeToMetadata = (opts: {
        type: Type;
        contextNode: TypeNode;
        optional: boolean;
      }) =>
        Effect.gen(function* () {
          const { type, contextNode, optional } = opts;
          const props = type.getProperties();

          if (!type.isObject() || props.length === 0) {
            return yield* new CannotBuildTypeReferenceMetadata({
              raw: type.getText(),
              kind: contextNode.getKind(),
            });
          }

          const metadata: Record<string, TypeNodeMetadata> = {};

          for (const prop of props) {
            const propName = prop.getName();
            const propType = prop.getTypeAtLocation(contextNode);
            const isOptional = prop.isOptional();

            const tempSource = contextNode
              .getProject()
              .createSourceFile(
                `__temp_${randomUUID()}.ts`,
                `type __T = ${propType.getText()}`,
                { overwrite: true },
              );
            const tempTypeNode = tempSource
              .getTypeAliasOrThrow('__T')
              .getTypeNodeOrThrow();
            const propMetadata = yield* Effect.suspend(() =>
              generateMetadata({
                typeNode: tempTypeNode,
                optional: isOptional,
              }),
            );

            metadata[propName] = propMetadata;
            contextNode.getProject().removeSourceFile(tempSource);
          }

          return {
            kind: 'TYPE_LITERAL' as const,
            metadata,
            optional,
          };
        });

      const generateMetadata = (opts: {
        typeNode: TypeNode;
        optional: boolean;
      }): Effect.Effect<
        TypeNodeMetadata,
        | UnsupportedSyntaxKindError
        | MultipleSymbolDeclarationsError
        | MissingSymbolDeclarationError
        | CannotBuildTypeReferenceMetadata
      > =>
        Effect.gen(function* () {
          const { typeNode, optional } = opts;
          const kind = typeNode.getKind();

          const typeNodeMetada = Match.value<SyntaxKind>(kind).pipe(
            Match.when(Match.is(SyntaxKind.StringKeyword), () =>
              Effect.succeed({
                kind: 'STRING' as const,
                optional,
              }),
            ),
            Match.when(Match.is(SyntaxKind.NumberKeyword), () =>
              Effect.succeed({
                kind: 'NUMBER' as const,
                optional,
              }),
            ),
            Match.when(Match.is(SyntaxKind.BooleanKeyword), () =>
              Effect.succeed({
                kind: 'BOOLEAN' as const,
                optional,
              }),
            ),
            Match.when(Match.is(SyntaxKind.UndefinedKeyword), () =>
              Effect.succeed({
                kind: 'UNDEFINED' as const,
                optional,
              }),
            ),
            Match.when(Match.is(SyntaxKind.ArrayType), () =>
              Effect.succeed({
                kind: 'ARRAY' as const,
                optional,
              }),
            ),
            Match.when(Match.is(SyntaxKind.LiteralType), () =>
              Effect.succeed({
                kind: 'LITERAL' as const,
                literalValue: typeNode
                  .asKindOrThrow(SyntaxKind.LiteralType)
                  .getLiteral()
                  .getText(),
                optional,
              }),
            ),
            Match.when(Match.is(SyntaxKind.TypeLiteral), () =>
              Effect.gen(function* () {
                const node = typeNode.asKindOrThrow(SyntaxKind.TypeLiteral);
                const members = node.getMembers();

                const metadata: Record<string, TypeNodeMetadata> =
                  yield* Effect.reduce(members, {}, (acc, member) =>
                    Effect.gen(function* () {
                      if (!member.isKind(SyntaxKind.PropertySignature)) {
                        return acc;
                      }

                      const typeNode = member.getTypeNode();
                      if (!typeNode) {
                        return acc;
                      }
                      const typeNodeName = member.getNameNode().getText();
                      const optional = member.hasQuestionToken();
                      const typeNodeMetadata = yield* Effect.suspend(() =>
                        generateMetadata({ typeNode, optional }),
                      );

                      return {
                        ...acc,
                        [typeNodeName]: typeNodeMetadata,
                      };
                    }),
                  );

                return {
                  kind: 'TYPE_LITERAL' as const,
                  metadata,
                  optional,
                };
              }),
            ),
            Match.when(Match.is(SyntaxKind.ImportType), () =>
              Effect.gen(function* () {
                const importType = typeNode.asKindOrThrow(
                  SyntaxKind.ImportType,
                );
                const type = importType.getType();
                const symbol = type.getSymbol();

                if (!symbol) {
                  throw new Error('TODO: missing symbol');
                }

                const declarations = symbol.getDeclarations();
                if (declarations && declarations.length > 1) {
                  return yield* new MultipleSymbolDeclarationsError();
                }
                const [declaration] = declarations;
                if (!declaration) {
                  return yield* new MissingSymbolDeclarationError();
                }

                // Try to resolve as object type
                return yield* resolveObjectTypeToMetadata({
                  type,
                  contextNode: importType,
                  optional,
                });
              }),
            ),
            Match.when(Match.is(SyntaxKind.TupleType), () =>
              Effect.gen(function* () {
                const node = typeNode.asKindOrThrow(SyntaxKind.TupleType);
                const nodes: TypeNode[] = node.getElements();

                const members = yield* Effect.all(
                  nodes.map((typeNode) =>
                    Effect.suspend(() =>
                      generateMetadata({ typeNode, optional: false }),
                    ),
                  ),
                );

                return { kind: 'TUPLE' as const, optional, members };
              }),
            ),
            Match.when(Match.is(SyntaxKind.TypeReference), () =>
              Effect.gen(function* () {
                const node = typeNode.asKindOrThrow(SyntaxKind.TypeReference);
                const typeName = node.getTypeName().getText();

                if (typeName === 'Date') {
                  return {
                    kind: 'DATE' as const,
                    optional,
                  };
                }

                if (typeName === 'Array') {
                  return {
                    kind: 'ARRAY' as const,
                    optional,
                  };
                }

                const typeArgs = node.getTypeArguments();

                if (typeName === 'Record') {
                  const [keyTypeArg, valueTypeArg] = typeArgs;
                  if (!keyTypeArg || !valueTypeArg) {
                    return yield* new UnsupportedSyntaxKindError({
                      kind: kind,
                      raw: typeNode.getText(),
                    });
                  }

                  const keyType = yield* Effect.suspend(() =>
                    generateMetadata({ typeNode: keyTypeArg, optional: false }),
                  );
                  const valueType = yield* Effect.suspend(() =>
                    generateMetadata({
                      typeNode: valueTypeArg,
                      optional: false,
                    }),
                  );

                  return {
                    kind: 'RECORD' as const,
                    keyType,
                    valueType,
                    optional,
                  };
                }

                // Built-in utility types - resolve via type system
                const builtInUtilityTypes = [
                  'Pick',
                  'Omit',
                  'Partial',
                  'Required',
                  'Readonly',
                  'Extract',
                  'NonNullable',
                ];

                if (builtInUtilityTypes.includes(typeName)) {
                  return yield* resolveObjectTypeToMetadata({
                    type: node.getType(),
                    contextNode: node,
                    optional,
                  });
                }

                // User-defined types
                const sym = node.getType().getAliasSymbol();

                // No symbol - try to resolve as object (handles z.infer, etc.)
                if (!sym) {
                  return yield* resolveObjectTypeToMetadata({
                    type: node.getType(),
                    contextNode: node,
                    optional,
                  });
                }

                const declarations = sym.getDeclarations();
                if (declarations && declarations.length > 1) {
                  return yield* new MultipleSymbolDeclarationsError();
                }
                const [declaration] = declarations;
                if (!declaration) {
                  return yield* new MissingSymbolDeclarationError();
                }

                const hasBuilder = sym
                  ?.getJsDocTags()
                  .map((tag) => tag.getName())
                  .includes(jsdocTag);

                if (!Node.isTypeAliasDeclaration(declaration)) {
                  throw new Error(
                    'TODO: for non-type-alias declarations (interfaces, etc.)',
                  );
                }

                const aliasTypeNode = declaration.getTypeNode();
                if (!aliasTypeNode) {
                  return yield* new UnsupportedSyntaxKindError({
                    kind: kind,
                    raw: typeNode.getText(),
                  });
                }

                if (!hasBuilder) {
                  return yield* Effect.suspend(() =>
                    generateMetadata({
                      typeNode: aliasTypeNode,
                      optional,
                    }),
                  );
                }

                return {
                  kind: 'BUILDER' as const,
                  name: declaration.getName(),
                  optional,
                };
              }),
            ),
            Match.when(Match.is(SyntaxKind.UnionType), () =>
              Effect.gen(function* () {
                const members = yield* Effect.all(
                  typeNode
                    .asKindOrThrow(SyntaxKind.UnionType)
                    .getTypeNodes()
                    .map((typeNode) =>
                      Effect.suspend(() =>
                        generateMetadata({ typeNode, optional: false }),
                      ),
                    ),
                );

                return { kind: 'UNION' as const, optional, members };
              }),
            ),
            Match.when(Match.is(SyntaxKind.IntersectionType), () =>
              Effect.gen(function* () {
                const node = typeNode.asKindOrThrow(
                  SyntaxKind.IntersectionType,
                );
                const types = node.getTypeNodes();

                const primitiveKinds = [
                  SyntaxKind.StringKeyword,
                  SyntaxKind.NumberKeyword,
                  SyntaxKind.BooleanKeyword,
                ];

                const primitiveType = types.find((t) =>
                  primitiveKinds.includes(t.getKind()),
                );

                if (primitiveType && types.length > 1) {
                  const baseMetadata = yield* Effect.suspend(() =>
                    generateMetadata({
                      typeNode: primitiveType,
                      optional: false,
                    }),
                  );

                  return {
                    kind: 'TYPE_CAST' as const,
                    baseTypeMetadata: baseMetadata,
                    optional,
                  };
                }

                throw new Error('TODO: handle it');
              }),
            ),

            Match.option,
          );

          if (Option.isNone(typeNodeMetada)) {
            return yield* new UnsupportedSyntaxKindError({
              kind,
              raw: typeNode.getText(),
            });
          }

          const result: TypeNodeMetadata = yield* typeNodeMetada.value;
          return result;
        });

      return {
        generateMetadata,
      };
    }),
  },
) {}

class UnsupportedSyntaxKindError extends Data.TaggedError(
  'UnsupportedSyntaxKindError',
)<{
  kind: SyntaxKind;
  raw: string;
}> {}

class MultipleSymbolDeclarationsError extends Data.TaggedError(
  'MultipleSymbolDeclarationsError',
) {}

class MissingSymbolDeclarationError extends Data.TaggedError(
  'MissingSymbolDeclarationError',
) {}

class CannotBuildTypeReferenceMetadata extends Data.TaggedError(
  'CannotBuildTypeReferenceMetadata',
)<{ raw: string; kind: SyntaxKind }> {}

export type TypeNodeMetadata =
  | {
      optional: boolean;
      kind: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'UNDEFINED' | 'ARRAY';
    }
  | {
      optional: boolean;
      kind: 'UNION';
      members: TypeNodeMetadata[];
    }
  | {
      optional: boolean;
      kind: 'LITERAL';
      literalValue: string;
    }
  | {
      optional: boolean;
      kind: 'TYPE_LITERAL';
      metadata: Record<string, TypeNodeMetadata>;
    }
  | {
      optional: boolean;
      kind: 'TUPLE';
      members: TypeNodeMetadata[];
    }
  | {
      kind: 'RECORD';
      keyType: TypeNodeMetadata;
      valueType: TypeNodeMetadata;
      optional: boolean;
    }
  | {
      kind: 'BUILDER';
      name: string;
      optional: boolean;
    }
  | {
      kind: 'TYPE_CAST';
      baseTypeMetadata: TypeNodeMetadata;
      optional: boolean;
    };
