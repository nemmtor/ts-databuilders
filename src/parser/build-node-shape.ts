import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import {
  type PropertySignature,
  SyntaxKind,
  type TypeElementTypes,
  type TypeLiteralNode,
} from 'ts-morph';
import {
  isSupportedSyntaxKind,
  SUPPORTED_SYNTAX_KIND,
  type SupportedSyntaxKind,
} from './supported-types';

type UnionTypePropertyShape = {
  optional: boolean;
  kind: SyntaxKind.UnionType;
  members: SyntaxKind[];
};
type TypePropertyShape =
  | {
      optional: boolean;
      kind: Exclude<SyntaxKind, SyntaxKind.UnionType>;
    }
  | UnionTypePropertyShape;

export type TypeLiteralShape = Record<string, TypePropertyShape>;

export const buildTypeLiteralShape = Effect.fnUntraced(function* (
  node: TypeLiteralNode,
) {
  const members = node.getMembers();

  return yield* Effect.reduce<
    TypeElementTypes,
    TypeLiteralShape,
    SignatureTypeNodeNotFound | UnsupportedSyntaxKind,
    never
  >(members, {}, (acc, member) =>
    Effect.gen(function* () {
      if (!member.isKind(SyntaxKind.PropertySignature)) {
        return acc;
      }

      const propertyName = member.getNameNode().getText();

      const propertyDetails = yield* buildProperty(member);

      return { ...acc, [propertyName]: propertyDetails };
    }),
  );
});

const buildProperty: (
  propertySignature: PropertySignature,
) => Effect.Effect<
  TypePropertyShape,
  SignatureTypeNodeNotFound | UnsupportedSyntaxKind,
  never
> = Effect.fnUntraced(function* (propertySignature) {
  const typeNode = propertySignature.getTypeNode();
  if (!typeNode) {
    return yield* new SignatureTypeNodeNotFound();
  }

  const optional = propertySignature.hasQuestionToken();
  const kind = typeNode.getKind();

  if (!isSupportedSyntaxKind(kind)) {
    return yield* new UnsupportedSyntaxKind({ kind });
  }

  // if (kind === ts.SyntaxKind.UnionType) {
  //   return Option.some<TypePropertyShape>({
  //     kind,
  //     members: typeNode
  //       .asKindOrThrow(ts.SyntaxKind.UnionType)
  //       .getTypeNodes()
  //       .map((n) => n.getKind()),
  //     optional,
  //   });
  // }

  // TODO: handle rest of kinds
  return Match.value<SupportedSyntaxKind>(kind).pipe(
    Match.withReturnType<TypePropertyShape>(),
    Match.when(Match.is(SUPPORTED_SYNTAX_KIND.STRING_KEYWORD), (kind) => ({
      kind,
      optional,
    })),
    Match.exhaustive,
  );
});

class SignatureTypeNodeNotFound extends Data.TaggedError(
  'SignatureTypeNodeNotFound',
) {}

class UnsupportedSyntaxKind extends Data.TaggedError('UnsupportedSyntaxKind')<{
  kind: SyntaxKind;
}> {}
