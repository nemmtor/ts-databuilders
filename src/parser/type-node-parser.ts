import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import { Node, SyntaxKind, type TypeNode } from 'ts-morph';
import { Configuration } from '../configuration';

export class TypeNodeParser extends Effect.Service<TypeNodeParser>()(
  '@TSDataBuilders/TypeNodeParser',
  {
    effect: Effect.gen(function* () {
      const { jsdocTag } = yield* Configuration;
      const generateMetadata = (opts: {
        typeNode: TypeNode;
        optional: boolean;
      }): Effect.Effect<
        TypeNodeMetadata,
        | UnsupportedSyntaxKindError
        | MultipleSymbolDeclarationsError
        | MissingSymbolDeclarationError
        | MissingSymbolError
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
            Match.when(
              (kind) =>
                kind === SyntaxKind.TypeReference &&
                typeNode.getText() === 'Date',
              () =>
                Effect.succeed({
                  kind: 'DATE' as const,
                  optional,
                }),
            ),
            Match.when(
              (kind) => kind === SyntaxKind.UndefinedKeyword,
              () =>
                Effect.succeed({
                  kind: 'UNDEFINED' as const,
                  optional,
                }),
            ),
            Match.when(
              (kind) => kind === SyntaxKind.ArrayType,
              () =>
                Effect.succeed({
                  kind: 'ARRAY' as const,
                  optional,
                }),
            ),

            Match.when(
              (kind) => kind === SyntaxKind.LiteralType,
              () =>
                Effect.succeed({
                  kind: 'LITERAL' as const,
                  literalValue: typeNode
                    .asKindOrThrow(SyntaxKind.LiteralType)
                    .getLiteral()
                    .getText(),
                  optional,
                }),
            ),
            Match.when(
              (kind) => kind === SyntaxKind.TypeLiteral,
              () =>
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

                if (typeName === 'Array') {
                  return {
                    kind: 'ARRAY' as const,
                    optional,
                  };
                }

                const sym = node.getType().getAliasSymbol();
                if (!sym) {
                  return yield* new MissingSymbolError();
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

                // If there's a primitive and other types, treat as branded/type cast
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

class MissingSymbolError extends Data.TaggedError('MissingSymbolError') {}

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
