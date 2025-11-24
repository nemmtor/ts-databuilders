import * as Effect from 'effect/Effect';

import * as ts from '../typescript';
import * as ParserError from './parser.error';
import type * as ParserType from './parser.type';
import * as ParserUtil from './parser.util';
import * as TypeNodeParser from './type-node-parser.service';

export class TypeLiteralParser extends Effect.Service<TypeLiteralParser>()(
  '@TSDataBuilders/TypeLiteralParser',
  {
    effect: Effect.gen(function* () {
      const typeNodeParser = yield* TypeNodeParser.TypeNodeParser;

      const parseMembers = (
        members: readonly ts.TypeElement[],
        opts: {
          onTypeLiteral: (
            typeLiteralNode: ts.TypeLiteralNode,
          ) => Effect.Effect<
            ParserType.PropertySignature[],
            ParserError.TypeLiteralParserError
          >;
        },
      ) =>
        Effect.all(
          members
            .filter((child) => !ts.isIndexSignatureDeclaration(child))
            .map(
              Effect.fn(function* (child) {
                if (!ts.isPropertySignature(child)) {
                  return yield* new ParserError.UnsupportedTypeLiteralNodeMemberError();
                }

                if (!child.type) {
                  return yield* new ParserError.MissingPropertySignatureTypeNodeError();
                }

                const typeNode = yield* typeNodeParser.parse(child.type, {
                  onTypeLiteral: opts.onTypeLiteral,
                });

                const name = yield* Effect.try({
                  try: () =>
                    'escapedText' in child.name
                      ? child.name.escapedText.toString()
                      : child.name.getText(),
                  catch: (cause) =>
                    new ParserError.GetTypeNodeNameTextError({
                      cause,
                    }),
                });

                return {
                  name,
                  typeNode,
                  hasQuestionToken: Boolean(child.questionToken),
                  jsDocTags: yield* ParserUtil.getJsDocTags(child),
                };
              }),
            ),
          { concurrency: 'unbounded' },
        );

      const parseTypeLiteral = (typeLiteralNode: ts.TypeLiteralNode) =>
        parseMembers(typeLiteralNode.members, {
          onTypeLiteral: parseTypeLiteral,
        });

      return {
        parseMembers,
        parse: parseTypeLiteral,
      };
    }),
    dependencies: [TypeNodeParser.TypeNodeParser.Default],
  },
) {}
