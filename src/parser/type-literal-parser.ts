import * as Effect from 'effect/Effect';
import { SyntaxKind, type TypeLiteralNode } from 'ts-morph';
import {
  type PropertySignatureMetadata,
  PropertySignatureParser,
} from './property-signature-parser';

export class TypeLiteralParser extends Effect.Service<TypeLiteralParser>()(
  '@TSDataBuilders/TypeLiteralParser',
  {
    effect: Effect.gen(function* () {
      const propertySignatureParser = yield* PropertySignatureParser;

      return {
        generateMetadata: Effect.fnUntraced(function* (node: TypeLiteralNode) {
          const members = node.getMembers();

          const result: TypeLiteralMetadata = yield* Effect.reduce(
            members,
            {},
            (acc, member) =>
              Effect.gen(function* () {
                if (!member.isKind(SyntaxKind.PropertySignature)) {
                  return acc;
                }

                const propertySignatureName = member.getNameNode().getText();

                const propertySignatureMetadata =
                  yield* propertySignatureParser.generateMetadata(member);

                return {
                  ...acc,
                  [propertySignatureName]: propertySignatureMetadata,
                };
              }),
          );

          return result;
        }),
      };
    }),
    dependencies: [PropertySignatureParser.Default],
  },
) {}

export type TypeLiteralMetadata = Record<string, PropertySignatureMetadata>;
