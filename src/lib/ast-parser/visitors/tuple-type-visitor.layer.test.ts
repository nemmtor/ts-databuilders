import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import {
  createTestTypescriptProjectLayer,
  createTupleTypeNode,
  createTypeNode,
} from '../../typescript/__test-utils__';
import * as ts from '../../typescript/typescript';
import { createTestVisitorLayer, visitTypeNode } from './__test-utils__';
import { TupleTypeVisitorLayer } from './tuple-type-visitor.layer';
import { TupleTypeVisitor } from './visitor';

const visitTypeNodeMock = vi.fn(() => visitTypeNode);

const TestLayer = createTestVisitorLayer({
  visitTypeNode: visitTypeNodeMock,
}).pipe(Layer.merge(createTestTypescriptProjectLayer()));

describe('TupleTypeVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TupleTypeVisitorLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const tupleTypeVisitor = yield* TupleTypeVisitor;

        expect(tupleTypeVisitor).toBeDefined();
      }),
    );

    it.effect(
      'should succeed with correct data',
      Effect.fnUntraced(function* () {
        const tupleTypeVisitor = yield* TupleTypeVisitor;
        const tupleTypeNode = createTupleTypeNode({
          elements: [createTypeNode({ kind: ts.SyntaxKind.StringKeyword })],
        });

        const result = yield* tupleTypeVisitor
          .visit(tupleTypeNode)
          .pipe(Effect.provide(TestLayer));

        expect(result).toEqual(
          expect.objectContaining({
            kind: ts.SyntaxKind.TupleType,
            elements: expect.any(Array),
          }),
        );
      }),
    );

    it.effect(
      'should delegate element nodes to type node visitor',
      Effect.fnUntraced(function* () {
        const elements = [
          createTypeNode({ kind: ts.SyntaxKind.StringKeyword }),
          createTypeNode({ kind: ts.SyntaxKind.NumberKeyword }),
        ];
        const tupleTypeVisitor = yield* TupleTypeVisitor;
        const tupleTypeNode = createTupleTypeNode({
          elements,
        });

        yield* tupleTypeVisitor
          .visit(tupleTypeNode)
          .pipe(Effect.provide(TestLayer));

        expect(visitTypeNodeMock).toHaveBeenCalledTimes(elements.length);
      }),
    );
  });
});
