import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';

export const ArrayTypeVisitorLayer = Layer.succeed(
  Visitor.ArrayTypeVisitor,
  Visitor.ArrayTypeVisitor.of({
    visit: (node: ts.ArrayTypeNode) =>
      Effect.succeed({
        kind: node.kind,
      }),
  }),
);
