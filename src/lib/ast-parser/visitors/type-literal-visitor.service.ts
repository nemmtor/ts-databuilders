import * as Effect from 'effect/Effect';

import type * as ts from '../typescript';

export class TypeLiteralVisitor extends Effect.Service<TypeLiteralVisitor>()(
  '@TSDataBuilders/ASTParser/TypeLiteralVisitor',
  {
    effect: Effect.gen(function* () {
      yield* Effect.logDebug('Instantiating TypeLiteralVisitor service');

      return {
        visit: Effect.fnUntraced(function* (node: ts.TypeLiteralNode) {
          console.log({ members: node.members });
        }),
      };
    }),
  },
) {}
