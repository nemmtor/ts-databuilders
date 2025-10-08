import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import {
  type PropertySignature,
  SyntaxKind,
  type TypeElementTypes,
  type TypeLiteralNode,
} from 'ts-morph';
import { PROPERTY_TYPE, type PropertyType } from './supported-types';

// type UnionTypePropertyShape = {
//   optional: boolean;
//   kind: SyntaxKind.UnionType;
//   members: SyntaxKind[];
// };

export type TypePropertyShape = {
  optional: boolean;
  kind: Extract<
    PropertyType,
    'BOOLEAN' | 'STRING' | 'NUMBER' | 'DATE' | 'UNDEFINED' | 'NULL'
  >;
};
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

const buildProperty = Effect.fnUntraced(function* (
  propertySignature: PropertySignature,
) {
  const typeNode = propertySignature.getTypeNode();
  if (!typeNode) {
    return yield* new SignatureTypeNodeNotFound();
  }

  const optional = propertySignature.hasQuestionToken();
  const kind = typeNode.getKind();

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
  const typePropertyShape = Match.value<SyntaxKind>(kind).pipe(
    Match.withReturnType<TypePropertyShape>(),
    Match.when(Match.is(SyntaxKind.StringKeyword), () => ({
      kind: PROPERTY_TYPE.STRING,
      optional,
    })),
    Match.when(Match.is(SyntaxKind.NumberKeyword), () => ({
      kind: PROPERTY_TYPE.NUMBER,
      optional,
    })),
    Match.when(Match.is(SyntaxKind.BooleanKeyword), () => ({
      kind: PROPERTY_TYPE.BOOLEAN,
      optional,
    })),
    Match.when(
      (kind) =>
        kind === SyntaxKind.TypeReference && typeNode.getText() === 'Date',
      () => ({
        kind: PROPERTY_TYPE.DATE,
        optional,
      }),
    ),
    Match.when(
      (kind) => kind === SyntaxKind.UndefinedKeyword,
      () => ({
        kind: PROPERTY_TYPE.UNDEFINED,
        optional,
      }),
    ),
    Match.when(
      (kind) =>
        kind === SyntaxKind.LiteralType &&
        typeNode
          .asKindOrThrow(SyntaxKind.LiteralType)
          .getLiteral()
          .getKind() === SyntaxKind.NullKeyword,
      () => ({
        kind: PROPERTY_TYPE.NULL,
        optional,
      }),
    ),
    Match.option,
    Function.identity<Option.Option<TypePropertyShape>>,
  );

  if (Option.isNone(typePropertyShape)) {
    return yield* new UnsupportedSyntaxKind({ kind, raw: typeNode.getText() });
  }

  return typePropertyShape.value;
});

class SignatureTypeNodeNotFound extends Data.TaggedError(
  'SignatureTypeNodeNotFound',
) {}

class UnsupportedSyntaxKind extends Data.TaggedError('UnsupportedSyntaxKind')<{
  kind: SyntaxKind;
  raw: string;
}> {}
