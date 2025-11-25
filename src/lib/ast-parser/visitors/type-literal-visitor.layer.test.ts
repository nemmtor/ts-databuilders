import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import {
  createPropertySignature,
  createTestTypescriptProjectLayer,
  createTypeElement,
  createTypeLiteralNode,
} from '../../typescript/__test-utils__';
import * as ts from '../../typescript/typescript';
import {
  createTestVisitorLayer,
  visitPropertySignature,
} from './__test-utils__';
import { TypeLiteralVisitorLayer } from './type-literal-visitor.layer';
import { TypeLiteralVisitor } from './visitor';

const visitPropertySignatureMock = vi.fn(() => visitPropertySignature);
const TestLayer = createTestVisitorLayer({
  visitPropertySignature: visitPropertySignatureMock,
}).pipe(Layer.merge(createTestTypescriptProjectLayer()));

describe('TypeLiteralVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TypeLiteralVisitorLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const typeLiteralVisitor = yield* TypeLiteralVisitor;

        expect(typeLiteralVisitor).toBeDefined();
      }),
    );

    it.effect(
      'should delegate property signature to its own visitor',
      Effect.fnUntraced(function* () {
        const typeLiteralNode = createTypeLiteralNode({
          members: [createPropertySignature()],
        });
        const typeLiteralVisitor = yield* TypeLiteralVisitor;

        yield* typeLiteralVisitor
          .visit(typeLiteralNode)
          .pipe(Effect.provide(TestLayer));

        expect(visitPropertySignatureMock).toHaveBeenCalled();
      }),
    );

    it.effect(
      'should ignore members other than property signture',
      Effect.fnUntraced(function* () {
        const typeLiteralNode = createTypeLiteralNode({
          members: [
            createPropertySignature(),
            createTypeElement({ kind: ts.SyntaxKind.MethodSignature }),
          ],
        });
        const typeLiteralVisitor = yield* TypeLiteralVisitor;

        const result = yield* typeLiteralVisitor
          .visit(typeLiteralNode)
          .pipe(Effect.provide(TestLayer));

        expect(result.members).toHaveLength(1);
        expect(result.members[0]?.kind).toBe(ts.SyntaxKind.PropertySignature);
      }),
    );
  });
});
