import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';
import * as VisitorError from './visitor.errors';

export const BuiltinOpaqueTypeVisitorLayer = Layer.succeed(
  Visitor.BuiltinOpaqueTypeVisitor,
  Visitor.BuiltinOpaqueTypeVisitor.of({
    visit: Effect.fnUntraced(function* (node: ts.TypeReferenceNode) {
      if (!ts.isBuiltinOpaqueType(node)) {
        return yield* new VisitorError.ExpectedDifferentTypeError({
          expected: ts.BUILTIN_OPAQUE_TYPES,
          received: node.typeName.getText(),
        });
      }

      return {
        kind: node.kind,
        typeName: node.typeName.getText(),
      };
    }),
  }),
);
