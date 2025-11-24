import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import {
  createTestTypescriptProjectLayer,
  createTypeReferenceNode,
} from '../../typescript/__test-utils__';
import * as ts from '../../typescript/typescript';
import { createTestVisitorLayer } from './__test-utils__';
import { BuiltinOpaqueTypeVisitorLayer } from './builtin-opaque-type-visitor.layer';
import { BuiltinOpaqueTypeVisitor } from './visitor';
import { ExpectedDifferentTypeError } from './visitor.errors';

const TestLayer = createTestVisitorLayer().pipe(
  Layer.merge(createTestTypescriptProjectLayer()),
);

describe('BuiltinOpaqueTypeVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(BuiltinOpaqueTypeVisitorLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const builtinOpaqueTypeVisitor = yield* BuiltinOpaqueTypeVisitor;

        expect(builtinOpaqueTypeVisitor).toBeDefined();
      }),
    );

    it.effect.each(ts.BUILTIN_OPAQUE_TYPES)(
      'should succeed with correct data for %s',
      Effect.fnUntraced(function* (typeName) {
        const builtinOpaqueTypeVisitor = yield* BuiltinOpaqueTypeVisitor;

        const result = yield* builtinOpaqueTypeVisitor
          .visit(
            createTypeReferenceNode({
              typeName: { getText: () => typeName },
            }),
          )
          .pipe(Effect.provide(TestLayer));

        expect(result).toEqual({ kind: ts.SyntaxKind.TypeReference, typeName });
      }),
    );

    it.effect(
      'should fail with ExpectedDifferentTypeError when received type that is not opaque builtin type',
      Effect.fnUntraced(function* () {
        const builtinOpaqueTypeVisitor = yield* BuiltinOpaqueTypeVisitor;

        const result = yield* builtinOpaqueTypeVisitor
          .visit(
            createTypeReferenceNode({ typeName: { getText: () => 'Test' } }),
          )
          .pipe(Effect.flip, Effect.provide(TestLayer));

        expect(result).toBeInstanceOf(ExpectedDifferentTypeError);
        expect(
          result instanceof ExpectedDifferentTypeError && result.expected,
        ).toEqual(ts.BUILTIN_OPAQUE_TYPES);
        expect(
          result instanceof ExpectedDifferentTypeError && result.received,
        ).toBe('Test');
      }),
    );
  });
});
