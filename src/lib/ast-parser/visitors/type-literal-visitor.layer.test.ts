import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import {
  createNode,
  createSyntaxList,
  createTypeLiteralNode,
} from '../../typescript/__test-utils__';
import * as ts from '../../typescript/typescript';
import { createTestVisitorLayer, visitSyntaxList } from './__test-utils__';
import { TypeLiteralVisitorLayer } from './type-literal-visitor.layer';
import { TypeLiteralVisitor } from './visitor';
import { GetNodeChildrenError } from './visitor.errors';

const visitSyntaxListMock = vi.fn(() => visitSyntaxList);
const TestLayer = createTestVisitorLayer({
  visitSyntaxList: visitSyntaxListMock,
});

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
      'should delegate syntax list to its own visitor',
      Effect.fnUntraced(function* () {
        const typeLiteralNode = createTypeLiteralNode({
          getChildren: () => [createSyntaxList()],
        });
        const typeLiteralVisitor = yield* TypeLiteralVisitor;

        yield* typeLiteralVisitor
          .visit(typeLiteralNode)
          .pipe(Effect.provide(TestLayer));

        expect(visitSyntaxListMock).toHaveBeenCalled();
      }),
    );

    it.effect(
      'should ignore children other than syntax list',
      Effect.fnUntraced(function* () {
        const typeLiteralNode = createTypeLiteralNode({
          getChildren: () => [
            createNode({ kind: ts.SyntaxKind.OpenBraceToken }),
          ],
        });
        const typeLiteralVisitor = yield* TypeLiteralVisitor;

        const result = yield* typeLiteralVisitor
          .visit(typeLiteralNode)
          .pipe(Effect.provide(TestLayer));

        expect(result.members).toHaveLength(0);
      }),
    );

    it.effect(
      'should fail with GetNodeChildrenError if getChildren fails',
      Effect.fnUntraced(function* () {
        const error = new Error('error');
        const syntaxList = createTypeLiteralNode({
          getChildren: () => {
            throw error;
          },
        });
        const typeLiteralVisitor = yield* TypeLiteralVisitor;

        const result = yield* typeLiteralVisitor
          .visit(syntaxList)
          .pipe(Effect.flip, Effect.provide(TestLayer));

        expect(result).toBeInstanceOf(GetNodeChildrenError);
        expect(result.cause).toBe(error);
      }),
    );
  });
});
