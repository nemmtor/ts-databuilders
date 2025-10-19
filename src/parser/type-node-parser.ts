import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import { SyntaxKind, type TypeNode } from 'ts-morph';

const generateTypeNodeMetadata = Effect.fnUntraced(function* (
  typeNode: TypeNode,
  optional: boolean,
) {
  const kind = typeNode.getKind();

  // TODO: handle rest of kinds
  const typeNodeMetada = Match.value<SyntaxKind>(kind).pipe(
    Match.withReturnType<
      Effect.Effect<TypeNodeMetadata, UnsupportedSyntaxKind>
    >(),
    Match.when(Match.is(SyntaxKind.StringKeyword), () =>
      Effect.succeed({
        kind: 'STRING',
        optional,
      }),
    ),
    Match.when(Match.is(SyntaxKind.NumberKeyword), () =>
      Effect.succeed({
        kind: 'NUMBER',
        optional,
      }),
    ),
    Match.when(Match.is(SyntaxKind.BooleanKeyword), () =>
      Effect.succeed({
        kind: 'BOOLEAN',
        optional,
      }),
    ),
    Match.when(
      (kind) =>
        kind === SyntaxKind.TypeReference && typeNode.getText() === 'Date',
      () =>
        Effect.succeed({
          kind: 'DATE',
          optional,
        }),
    ),
    Match.when(
      (kind) => kind === SyntaxKind.UndefinedKeyword,
      () =>
        Effect.succeed({
          kind: 'UNDEFINED',
          optional,
        }),
    ),
    Match.when(
      (kind) => kind === SyntaxKind.LiteralType,
      () =>
        Effect.succeed({
          kind: 'LITERAL',
          literalValue: typeNode
            .asKindOrThrow(SyntaxKind.LiteralType)
            .getLiteral()
            .getText(),
          optional,
        }),
    ),
    Match.when(
      (kind) => kind === SyntaxKind.TypeLiteral,
      (): Effect.Effect<TypeNodeMetadata, UnsupportedSyntaxKind> =>
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
                const typeNodeMetadata = yield* generateTypeNodeMetadata(
                  typeNode,
                  optional,
                );

                return {
                  ...acc,
                  [typeNodeName]: typeNodeMetadata,
                };
              }),
            );

          return {
            kind: 'TYPE_LITERAL',
            metadata,
            optional,
          };
        }),
    ),
    Match.when(
      Match.is(SyntaxKind.UnionType),
      (): Effect.Effect<TypeNodeMetadata, UnsupportedSyntaxKind> =>
        Effect.gen(function* () {
          const members = yield* Effect.all(
            typeNode
              .asKindOrThrow(SyntaxKind.UnionType)
              .getTypeNodes()
              .map((typeNode) => generateTypeNodeMetadata(typeNode, false)),
          );

          return { kind: 'UNION', optional, members };
        }),
    ),

    Match.option,
  );

  if (Option.isNone(typeNodeMetada)) {
    return yield* new UnsupportedSyntaxKind({
      kind,
      raw: typeNode.getText(),
    });
  }

  const result: TypeNodeMetadata = yield* typeNodeMetada.value;
  return result;
});

export class TypeNodeParser extends Effect.Service<TypeNodeParser>()(
  '@TSDataBuilders/TypeNodeParser',
  {
    succeed: {
      generateMetadata: generateTypeNodeMetadata,
    },
  },
) {}

class UnsupportedSyntaxKind extends Data.TaggedError('UnsupportedSyntaxKind')<{
  kind: SyntaxKind;
  raw: string;
}> {}

export type TypeNodeMetadata =
  | {
      optional: boolean;
      kind: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'UNDEFINED';
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
    };
