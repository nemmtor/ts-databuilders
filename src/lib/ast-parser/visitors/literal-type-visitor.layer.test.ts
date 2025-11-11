import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { createTypeNode } from '../../typescript/__test-utils__';
import * as ts from '../../typescript/typescript';
import { createTestVisitorLayer } from './__test-utils__';
import { LiteralTypeVisitorLayer } from './literal-type-visitor.layer';
import { LiteralTypeVisitor } from './visitor';
import { ExpectedDifferentSyntaxKindError } from './visitor.errors';

const TestLayer = createTestVisitorLayer();

describe('LiteralTypeVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(LiteralTypeVisitorLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const literalTypeVisitor = yield* LiteralTypeVisitor;

        expect(literalTypeVisitor).toBeDefined();
      }),
    );

    it.effect.each([
      { literal: "'a'", case: 'string literal' },
      {
        literal: '1',
        case: 'number literal',
      },
      {
        literal: 'true',
        case: 'boolean literal (true)',
      },
      {
        literal: 'false',
        case: 'boolean literal (false)',
      },
      {
        literal: 'null',
        case: 'null literal',
      },
      {
        literal: '1n',
        case: 'bigint literal',
      },
    ])(
      'should succeed with correct data for $case',
      Effect.fnUntraced(function* ({ literal }) {
        const literalTypeVisitor = yield* LiteralTypeVisitor;

        const result = yield* literalTypeVisitor
          .visit(
            createTypeNode({
              kind: ts.SyntaxKind.LiteralType,
              getText: () => literal,
            }),
          )
          .pipe(Effect.provide(TestLayer));

        expect(result).toEqual({ kind: ts.SyntaxKind.LiteralType, literal });
      }),
    );

    it.effect(
      'should fail with ExpectedDifferentSyntaxKindError when received type node is not literal type',
      Effect.fnUntraced(function* () {
        const literalTypeVisitor = yield* LiteralTypeVisitor;

        const result = yield* literalTypeVisitor
          .visit(createTypeNode({ kind: ts.SyntaxKind.AbstractKeyword }))
          .pipe(Effect.flip, Effect.provide(TestLayer));

        expect(result).toBeInstanceOf(ExpectedDifferentSyntaxKindError);
        expect(
          result instanceof ExpectedDifferentSyntaxKindError && result.expected,
        ).toEqual([ts.SyntaxKind.LiteralType]);
        expect(
          result instanceof ExpectedDifferentSyntaxKindError && result.received,
        ).toBe(ts.SyntaxKind.AbstractKeyword);
      }),
    );
  });
});
