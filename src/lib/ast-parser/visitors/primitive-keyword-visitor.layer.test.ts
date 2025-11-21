import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { createTypeNode } from '../../typescript/__test-utils__';
import * as ts from '../../typescript/typescript';
import { createTestVisitorLayer } from './__test-utils__';
import { PrimitiveKeywordVisitorLayer } from './primitive-keyword-visitor.layer';
import { PrimitiveKeywordVisitor } from './visitor';
import { ExpectedDifferentSyntaxKindError } from './visitor.errors';

const TestLayer = createTestVisitorLayer();

describe('PrimitiveKeywordVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(PrimitiveKeywordVisitorLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const propertySignatureVisitor = yield* PrimitiveKeywordVisitor;

        expect(propertySignatureVisitor).toBeDefined();
      }),
    );

    it.effect.each(
      ts.PRIMITIVE_KEYWORD_SYNTAX_KINDS.map((kind) => ({
        kind,
        case: ts.SyntaxKind[kind],
      })),
    )(
      'should succeed with correct data for $case',
      Effect.fnUntraced(function* ({ kind }) {
        const propertySignatureVisitor = yield* PrimitiveKeywordVisitor;

        const result = yield* propertySignatureVisitor
          .visit(createTypeNode({ kind }))
          .pipe(Effect.provide(TestLayer));

        expect(result).toEqual({ kind });
      }),
    );

    it.effect(
      'should fail with ExpectedDifferentSyntaxKindError when received type node is not primitive kind',
      Effect.fnUntraced(function* () {
        const propertySignatureVisitor = yield* PrimitiveKeywordVisitor;

        const result = yield* propertySignatureVisitor
          .visit(createTypeNode({ kind: ts.SyntaxKind.AbstractKeyword }))
          .pipe(Effect.flip, Effect.provide(TestLayer));

        expect(result).toBeInstanceOf(ExpectedDifferentSyntaxKindError);
        expect(
          result instanceof ExpectedDifferentSyntaxKindError && result.expected,
        ).toEqual(ts.PRIMITIVE_KEYWORD_SYNTAX_KINDS);
        expect(
          result instanceof ExpectedDifferentSyntaxKindError && result.received,
        ).toBe(ts.SyntaxKind.AbstractKeyword);
      }),
    );
  });
});
