import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import {
  createTypeNode,
  createUnionTypeNode,
} from '../../typescript/__test-utils__';
import * as ts from '../../typescript/typescript';
import { createTestVisitorLayer, visitTypeNode } from './__test-utils__';
import { UnionTypeVisitorLayer } from './union-type-visitor.layer';
import { UnionTypeVisitor } from './visitor';

const visitTypeNodeMock = vi.fn(() => visitTypeNode);

const TestLayer = createTestVisitorLayer({
  visitTypeNode: visitTypeNodeMock,
});

describe('UnionTypeVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(UnionTypeVisitorLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const unionTypeVisitor = yield* UnionTypeVisitor;

        expect(unionTypeVisitor).toBeDefined();
      }),
    );

    it.effect(
      'should succeed with correct data',
      Effect.fnUntraced(function* () {
        const unionTypeVisitor = yield* UnionTypeVisitor;
        const unionTypeNode = createUnionTypeNode({
          types: [createTypeNode({ kind: ts.SyntaxKind.StringKeyword })],
        });

        const result = yield* unionTypeVisitor
          .visit(unionTypeNode)
          .pipe(Effect.provide(TestLayer));

        expect(result).toEqual(
          expect.objectContaining({
            kind: ts.SyntaxKind.UnionType,
            types: expect.any(Array),
          }),
        );
      }),
    );

    it.effect(
      'should delegate type nodes to its own visitor',
      Effect.fnUntraced(function* () {
        const types = [
          createTypeNode({ kind: ts.SyntaxKind.StringKeyword }),
          createTypeNode({ kind: ts.SyntaxKind.StringKeyword }),
        ];
        const unionTypeVisitor = yield* UnionTypeVisitor;
        const unionTypeNode = createUnionTypeNode({
          types,
        });

        yield* unionTypeVisitor
          .visit(unionTypeNode)
          .pipe(Effect.provide(TestLayer));

        expect(visitTypeNodeMock).toHaveBeenCalledTimes(types.length);
      }),
    );
  });
});
