import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { createArrayTypeNode } from '../../typescript/__test-utils__';
import * as ts from '../../typescript/typescript';
import { createTestVisitorLayer } from './__test-utils__';
import { ArrayTypeVisitorLayer } from './array-type-visitor.layer';
import { ArrayTypeVisitor } from './visitor';

const TestLayer = createTestVisitorLayer();

describe('ArrayTypeVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(ArrayTypeVisitorLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const arrayTypeVisitor = yield* ArrayTypeVisitor;

        expect(arrayTypeVisitor).toBeDefined();
      }),
    );

    it.effect(
      'should succeed with correct data',
      Effect.fnUntraced(function* () {
        const arrayTypeVisitor = yield* ArrayTypeVisitor;

        const result = yield* arrayTypeVisitor
          .visit(createArrayTypeNode())
          .pipe(Effect.provide(TestLayer));

        expect(result).toEqual({ kind: ts.SyntaxKind.ArrayType });
      }),
    );
  });
});
