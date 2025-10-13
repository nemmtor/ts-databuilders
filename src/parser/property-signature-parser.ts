import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import { type PropertySignature, SyntaxKind } from 'ts-morph';

export class PropertySignatureParser extends Effect.Service<PropertySignatureParser>()(
  '@TSDataBuilders/PropertySignatureParser',
  {
    succeed: {
      generateMetadata: Effect.fnUntraced(function* (
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
        const typePropertyShape: Option.Option<PropertySignatureMetadata> =
          Match.value<SyntaxKind>(kind).pipe(
            Match.withReturnType<PropertySignatureMetadata>(),
            Match.when(Match.is(SyntaxKind.StringKeyword), () => ({
              kind: 'STRING',
              optional,
            })),
            Match.when(Match.is(SyntaxKind.NumberKeyword), () => ({
              kind: 'NUMBER',
              optional,
            })),
            Match.when(Match.is(SyntaxKind.BooleanKeyword), () => ({
              kind: 'BOOLEAN',
              optional,
            })),
            Match.when(
              (kind) =>
                kind === SyntaxKind.TypeReference &&
                typeNode.getText() === 'Date',
              () => ({
                kind: 'DATE',
                optional,
              }),
            ),
            Match.when(
              (kind) => kind === SyntaxKind.UndefinedKeyword,
              () => ({
                kind: 'UNDEFINED',
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
                kind: 'NULL',
                optional,
              }),
            ),
            Match.option,
          );

        if (Option.isNone(typePropertyShape)) {
          return yield* new UnsupportedSyntaxKind({
            kind,
            raw: typeNode.getText(),
          });
        }

        return typePropertyShape.value;
      }),
    },
  },
) {}

class SignatureTypeNodeNotFound extends Data.TaggedError(
  'SignatureTypeNodeNotFound',
) {}

class UnsupportedSyntaxKind extends Data.TaggedError('UnsupportedSyntaxKind')<{
  kind: SyntaxKind;
  raw: string;
}> {}

export type PropertySignatureMetadata = {
  optional: boolean;
  kind: Extract<
    PropertyType,
    'BOOLEAN' | 'STRING' | 'NUMBER' | 'DATE' | 'UNDEFINED' | 'NULL'
  >;
};
type PropertyType =
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE'
  | 'UNDEFINED'
  | 'NULL';
