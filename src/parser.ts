import {
  Node,
  Project,
  type PropertySignature,
  SyntaxKind,
  type Type,
  type TypeNode,
} from 'ts-morph';

import * as FileSystem from '@effect/platform/FileSystem';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import * as Configuration from './configuration';
import * as IdGenerator from './lib/id-generator';

export class TypeNodeParser extends Effect.Service<TypeNodeParser>()(
  '@TSDataBuilders/TypeNodeParser',
  {
    effect: Effect.gen(function* () {
      const { jsdocTag, inlineDefaultJsdocTag } =
        yield* Configuration.Configuration;
      const idGenerator = yield* IdGenerator.IdGenerator;

      const getInlineDefault = Effect.fnUntraced(function* (
        member: PropertySignature,
      ) {
        const jsDocs = member.getJsDocs();

        for (const doc of jsDocs) {
          const tags = doc.getTags();
          const defaultTag = tags.find(
            (tag) => tag.getTagName() === inlineDefaultJsdocTag,
          );

          if (defaultTag) {
            const comment = defaultTag.getComment();
            if (typeof comment === 'string') {
              return Option.some(comment.trim());
            }
          }
        }

        return Option.none<string>();
      });

      const resolveObjectTypeToMetadata = Effect.fnUntraced(function* (opts: {
        type: Type;
        contextNode: TypeNode;
        optional: boolean;
        inlineDefault: Option.Option<string>;
      }) {
        const { type, contextNode, optional, inlineDefault } = opts;
        const props = type.getProperties();

        if (!type.isObject() || props.length === 0) {
          return yield* new CannotBuildTypeReferenceMetadataError({
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
              `__temp_${yield* idGenerator.generateUuid}.ts`,
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
              // TODO: double check if it should resolve inlineDefault
              inlineDefault: Option.none<string>(),
            }),
          );

          metadata[propName] = propMetadata;
          contextNode.getProject().removeSourceFile(tempSource);
        }

        return {
          kind: 'TYPE_LITERAL' as const,
          metadata,
          inlineDefault,
          optional,
        };
      });

      const generateMetadata = (opts: {
        typeNode: TypeNode;
        optional: boolean;
        inlineDefault: Option.Option<string>;
      }): Effect.Effect<
        TypeNodeMetadata,
        | UnsupportedSyntaxKindError
        | CannotBuildTypeReferenceMetadataError
        | MultipleSymbolDeclarationsError
        | MissingSymbolError
        | MissingSymbolDeclarationError
        | UnsupportedTypeAliasDeclarationError
      > =>
        Effect.gen(function* () {
          const { typeNode, optional, inlineDefault } = opts;
          const kind = typeNode.getKind();

          const typeNodeMetada = Match.value<SyntaxKind>(kind).pipe(
            Match.when(Match.is(SyntaxKind.StringKeyword), () =>
              Effect.succeed({
                kind: 'STRING' as const,
                inlineDefault,
                optional,
              }),
            ),
            Match.when(Match.is(SyntaxKind.NumberKeyword), () =>
              Effect.succeed({
                kind: 'NUMBER' as const,
                inlineDefault,
                optional,
              }),
            ),
            Match.when(Match.is(SyntaxKind.BooleanKeyword), () =>
              Effect.succeed({
                kind: 'BOOLEAN' as const,
                inlineDefault,
                optional,
              }),
            ),
            Match.when(Match.is(SyntaxKind.UndefinedKeyword), () =>
              Effect.succeed({
                kind: 'UNDEFINED' as const,
                inlineDefault,
                optional,
              }),
            ),
            Match.when(Match.is(SyntaxKind.ArrayType), () =>
              Effect.succeed({
                kind: 'ARRAY' as const,
                inlineDefault,
                optional,
              }),
            ),
            Match.when(Match.is(SyntaxKind.LiteralType), () => {
              const literalValue = typeNode
                .asKindOrThrow(SyntaxKind.LiteralType)
                .getLiteral()
                .getText();

              if (literalValue === 'null') {
                return Effect.succeed({
                  kind: 'NULL' as const,
                  inlineDefault,
                  optional,
                });
              }

              return Effect.succeed({
                kind: 'LITERAL' as const,
                inlineDefault,
                literalValue,
                optional,
              });
            }),
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
                      const inlineDefault = yield* getInlineDefault(member);
                      const typeNodeMetadata = yield* Effect.suspend(() =>
                        generateMetadata({ typeNode, optional, inlineDefault }),
                      );

                      return {
                        ...acc,
                        [typeNodeName]: typeNodeMetadata,
                      };
                    }),
                  );

                return {
                  kind: 'TYPE_LITERAL' as const,
                  inlineDefault,
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
                const raw = type.getText();

                if (!symbol) {
                  return yield* new MissingSymbolError({
                    raw,
                  });
                }

                const declarations = symbol.getDeclarations();
                if (declarations && declarations.length > 1) {
                  return yield* new MultipleSymbolDeclarationsError({
                    raw,
                  });
                }
                const [declaration] = declarations;
                if (!declaration) {
                  return yield* new MissingSymbolDeclarationError({
                    raw,
                  });
                }

                // Try to resolve as object type
                return yield* resolveObjectTypeToMetadata({
                  type,
                  contextNode: importType,
                  inlineDefault,
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
                      generateMetadata({
                        typeNode,
                        optional: false,
                        inlineDefault: Option.none<string>(),
                      }),
                    ),
                  ),
                  { concurrency: 'unbounded' },
                );

                return {
                  kind: 'TUPLE' as const,
                  inlineDefault,
                  optional,
                  members,
                };
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
                    inlineDefault,
                  };
                }

                if (typeName === 'Array') {
                  return {
                    kind: 'ARRAY' as const,
                    optional,
                    inlineDefault,
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
                    generateMetadata({
                      typeNode: keyTypeArg,
                      optional: false,
                      inlineDefault: Option.none<string>(),
                    }),
                  );
                  const valueType = yield* Effect.suspend(() =>
                    generateMetadata({
                      typeNode: valueTypeArg,
                      optional: false,
                      inlineDefault: Option.none<string>(),
                    }),
                  );

                  return {
                    kind: 'RECORD' as const,
                    keyType,
                    valueType,
                    optional,
                    inlineDefault,
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
                    inlineDefault,
                  });
                }

                // User-defined types
                const type = node.getType();
                const raw = type.getText();
                const sym = type.getAliasSymbol();
                // No symbol - try to resolve as object (handles z.infer, etc.)
                if (!sym) {
                  return yield* resolveObjectTypeToMetadata({
                    type,
                    contextNode: node,
                    optional,
                    inlineDefault,
                  });
                }

                const declarations = sym.getDeclarations();
                if (declarations && declarations.length > 1) {
                  return yield* new MultipleSymbolDeclarationsError({
                    raw,
                  });
                }
                const [declaration] = declarations;
                if (!declaration) {
                  return yield* new MissingSymbolDeclarationError({ raw });
                }

                const hasBuilder = sym
                  ?.getJsDocTags()
                  .map((tag) => tag.getName())
                  .includes(jsdocTag);

                if (!Node.isTypeAliasDeclaration(declaration)) {
                  return yield* new UnsupportedTypeAliasDeclarationError();
                }

                const aliasTypeNode = declaration.getTypeNode();
                if (!aliasTypeNode) {
                  return yield* new UnsupportedSyntaxKindError({
                    kind: kind,
                    raw,
                  });
                }

                if (!hasBuilder) {
                  return yield* Effect.suspend(() =>
                    generateMetadata({
                      typeNode: aliasTypeNode,
                      optional,
                      inlineDefault,
                    }),
                  );
                }

                return {
                  kind: 'BUILDER' as const,
                  name: declaration.getName(),
                  inlineDefault,
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
                        generateMetadata({
                          typeNode,
                          optional: false,
                          inlineDefault: Option.none<string>(),
                        }),
                      ),
                    ),
                  { concurrency: 'unbounded' },
                );

                return {
                  kind: 'UNION' as const,
                  optional,
                  members,
                  inlineDefault,
                };
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
                      inlineDefault,
                    }),
                  );

                  return {
                    kind: 'TYPE_CAST' as const,
                    baseTypeMetadata: baseMetadata,
                    inlineDefault,
                    optional,
                  };
                }

                return yield* new UnsupportedSyntaxKindError({
                  kind,
                  raw: typeNode.getText(),
                });
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
    dependencies: [IdGenerator.IdGenerator.Default],
  },
) {}

export type TypeNodeMetadata =
  | {
      optional: boolean;
      kind:
        | 'STRING'
        | 'NUMBER'
        | 'BOOLEAN'
        | 'DATE'
        | 'UNDEFINED'
        | 'NULL'
        | 'ARRAY';
      inlineDefault: Option.Option<string>;
    }
  | {
      optional: boolean;
      kind: 'UNION';
      members: TypeNodeMetadata[];
      inlineDefault: Option.Option<string>;
    }
  | {
      optional: boolean;
      kind: 'LITERAL';
      literalValue: string;
      inlineDefault: Option.Option<string>;
    }
  | {
      optional: boolean;
      kind: 'TYPE_LITERAL';
      metadata: Record<string, TypeNodeMetadata>;
      inlineDefault: Option.Option<string>;
    }
  | {
      optional: boolean;
      kind: 'TUPLE';
      members: TypeNodeMetadata[];
      inlineDefault: Option.Option<string>;
    }
  | {
      kind: 'RECORD';
      keyType: TypeNodeMetadata;
      valueType: TypeNodeMetadata;
      optional: boolean;
      inlineDefault: Option.Option<string>;
    }
  | {
      kind: 'BUILDER';
      name: string;
      optional: boolean;
      inlineDefault: Option.Option<string>;
    }
  | {
      kind: 'TYPE_CAST';
      baseTypeMetadata: TypeNodeMetadata;
      optional: boolean;
      inlineDefault: Option.Option<string>;
    };

export class Parser extends Effect.Service<Parser>()('@TSDataBuilders/Parser', {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const typeNodeParser = yield* TypeNodeParser;
    const { jsdocTag } = yield* Configuration.Configuration;

    return {
      generateBuildersMetadata: (path: string) =>
        Effect.gen(function* () {
          yield* Effect.logDebug(
            `[Parser](${path}): Generating builder metadata`,
          );

          yield* Effect.logDebug(`[Parser](${path}): Reading source code`);
          const sourceCode = yield* Effect.orDie(fs.readFileString(path));
          const eitherTypeLiteralsWithDataBuilder = yield* Effect.try({
            try: () => {
              const project = new Project();
              const file = project.createSourceFile(path, sourceCode, {
                overwrite: true,
              });
              const typeAliasesWithDataBuilder = file
                .getTypeAliases()
                .filter((typeAlias) =>
                  typeAlias
                    .getJsDocs()
                    .flatMap((jsDoc) =>
                      jsDoc.getTags().flatMap((tag) => tag.getTagName()),
                    )
                    .includes(jsdocTag),
                );

              return typeAliasesWithDataBuilder
                .map((typeAlias) => {
                  const name = typeAlias.getName();
                  if (!typeAlias.isExported()) {
                    return Either.left(
                      new UnexportedDatabuilderError({
                        typeName: name,
                      }),
                    );
                  }

                  const node = typeAlias.getTypeNode();
                  const isValidNodeKind =
                    node?.isKind(SyntaxKind.TypeLiteral) ||
                    node?.isKind(SyntaxKind.TypeReference);

                  if (!isValidNodeKind) {
                    return Either.left(
                      new UnsupportedBuilderTypeError({
                        typeName: typeAlias.getName(),
                      }),
                    );
                  }

                  return Either.right({
                    name: typeAlias.getName(),
                    node,
                  });
                })
                .filter(Boolean);
            },
            catch: (cause) => new ParserError({ cause }),
          });

          const typeLiteralsWithDataBuilder = yield* Effect.all(
            eitherTypeLiteralsWithDataBuilder.map((v) => v),
            { concurrency: 'unbounded' },
          );

          yield* Effect.logDebug(
            `[Parser](${path}): Generating metadata for types: ${typeLiteralsWithDataBuilder.map(({ name }) => name).join(', ')}`,
          );

          const result: DataBuilderMetadata[] = yield* Effect.all(
            typeLiteralsWithDataBuilder.map(({ name, node }) =>
              typeNodeParser
                .generateMetadata({
                  typeNode: node,
                  optional: false,
                  inlineDefault: Option.none<string>(),
                })
                .pipe(
                  Effect.tap(() =>
                    Effect.logDebug(
                      `[Parser](${path}): Finished generating metadata for type: ${name}`,
                    ),
                  ),
                  Effect.map((shape) => ({ name, shape, path })),
                ),
            ),
            { concurrency: 'unbounded' },
          );

          return result;
        }).pipe(
          Effect.catchTags({
            ParserError: (cause) => Effect.die(cause),
            MissingSymbolDeclarationError: (cause) =>
              Effect.dieMessage(
                `[Parser](${path}): Missing symbol declaration for type: ${cause.raw}`,
              ),
            UnsupportedTypeAliasDeclarationError: () =>
              Effect.dieMessage(
                `[Parser](${path}): Unsupported type alias declaration`,
              ),
            MultipleSymbolDeclarationsError: (cause) =>
              Effect.dieMessage(
                `[Parser](${path}): Missing symbol declaration error for type: ${cause.raw}`,
              ),
            MissingSymbolError: (cause) =>
              Effect.dieMessage(
                `[Parser](${path}): Missing symbol error for type: ${cause.raw}`,
              ),

            UnexportedDatabuilderError: (cause) =>
              Effect.dieMessage(
                `[Parser](${path}): Unexported databuilder ${cause.typeName}`,
              ),
            UnsupportedSyntaxKindError: (cause) =>
              Effect.dieMessage(
                `[Parser](${path}): Unsupported syntax kind of id: ${cause.kind} for type: ${cause.raw}`,
              ),
            CannotBuildTypeReferenceMetadataError: (cause) =>
              Effect.dieMessage(
                `[Parser](${path}): Cannot build type reference metadata with kind of id: ${cause.kind} for type: ${cause.raw}. Is it a root of databuilder?`,
              ),
            UnsupportedBuilderTypeError: (cause) =>
              Effect.dieMessage(
                `[Parser](${path}): Unsupported builder type ${cause.typeName}`,
              ),
          }),
        ),
    };
  }),
  dependencies: [TypeNodeParser.Default],
}) {}

export type DataBuilderMetadata = {
  name: string;
  shape: TypeNodeMetadata;
  path: string;
};

class UnsupportedSyntaxKindError extends Data.TaggedError(
  'UnsupportedSyntaxKindError',
)<{
  kind: SyntaxKind;
  raw: string;
}> {}

class UnsupportedTypeAliasDeclarationError extends Data.TaggedError(
  'UnsupportedTypeAliasDeclarationError',
) {}

class CannotBuildTypeReferenceMetadataError extends Data.TaggedError(
  'CannotBuildTypeReferenceMetadataError',
)<{ raw: string; kind: SyntaxKind }> {}

class ParserError extends Data.TaggedError('ParserError')<{
  cause: unknown;
}> {}

class UnexportedDatabuilderError extends Data.TaggedError(
  'UnexportedDatabuilderError',
)<{
  typeName: string;
}> {}

class UnsupportedBuilderTypeError extends Data.TaggedError(
  'UnsupportedBuilderTypeError',
)<{
  typeName: string;
}> {}

class MissingSymbolError extends Data.TaggedError('MissingSymbolError')<{
  raw: string;
}> {}

class MissingSymbolDeclarationError extends Data.TaggedError(
  'MissingSymbolDeclarationError',
)<{
  raw: string;
}> {}

class MultipleSymbolDeclarationsError extends Data.TaggedError(
  'MultipleSymbolDeclarationsError',
)<{
  raw: string;
}> {}
