import * as Effect from 'effect/Effect';
import { SyntaxKind, type TypeLiteralNode } from 'ts-morph';
import { type TypeNodeMetadata, TypeNodeParser } from './type-node-parser';

export class TypeLiteralParser extends Effect.Service<TypeLiteralParser>()(
  '@TSDataBuilders/TypeLiteralParser',
  {
    effect: Effect.gen(function* () {
      const typeNodeParser = yield* TypeNodeParser;

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

                const typeNode = member.getTypeNode();
                if (!typeNode) {
                  return acc;
                }
                const typeNodeName = member.getNameNode().getText();

                const optional = member.hasQuestionToken();
                const typeNodeMetadata = yield* typeNodeParser.generateMetadata(
                  typeNode,
                  optional,
                );

                return {
                  ...acc,
                  [typeNodeName]: typeNodeMetadata,
                };
              }),
          );

          return result;
        }),
      };
    }),
    dependencies: [TypeNodeParser.Default],
  },
) {}

export type TypeLiteralMetadata = Record<string, TypeNodeMetadata>;
