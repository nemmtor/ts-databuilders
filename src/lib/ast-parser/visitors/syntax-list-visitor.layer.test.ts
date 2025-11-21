import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import {
  createNode,
  createPropertySignature,
  createSyntaxList,
  createTypeAliasDeclaration,
} from '../../typescript/__test-utils__';
import * as ts from '../../typescript/typescript';
import {
  createTestVisitorLayer,
  visitPropertySignature,
  visitTypeAliasDeclaration,
} from './__test-utils__';
import { SyntaxListVisitorLayer } from './syntax-list-visitor.layer';
import { SyntaxListVisitor } from './visitor';
import { GetNodeChildrenError } from './visitor.errors';

const visitTypeAliasDeclarationMock = vi.fn(() => visitTypeAliasDeclaration);
const visitPropertySignatureMock = vi.fn(() => visitPropertySignature);

const TestLayer = createTestVisitorLayer({
  visitTypeAliasDeclaration: visitTypeAliasDeclarationMock,
  visitPropertySignature: visitPropertySignatureMock,
});

describe('SyntaxListVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(SyntaxListVisitorLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const syntaxListVisitor = yield* SyntaxListVisitor;

        expect(syntaxListVisitor).toBeDefined();
      }),
    );

    it.effect.each([
      { case: 'ClassDeclaration', kind: ts.SyntaxKind.ClassDeclaration },
      {
        case: 'EnumDeclaration',
        kind: ts.SyntaxKind.EnumDeclaration,
      },
    ])(
      'should ignore $case',
      Effect.fnUntraced(function* ({ kind }) {
        const syntaxList = createSyntaxList({
          getChildren: () => [createNode({ kind })],
        });
        const syntaxListVisitor = yield* SyntaxListVisitor;

        const result = yield* syntaxListVisitor
          .visit(syntaxList)
          .pipe(Effect.provide(TestLayer));

        expect(result).toHaveLength(0);
      }),
    );

    it.effect(
      'should delegate type alias declaration to its own visitor',
      Effect.fnUntraced(function* () {
        const syntaxList = createSyntaxList({
          getChildren: () => [createTypeAliasDeclaration()],
        });
        const syntaxListVisitor = yield* SyntaxListVisitor;

        yield* syntaxListVisitor
          .visit(syntaxList)
          .pipe(Effect.provide(TestLayer));

        expect(visitTypeAliasDeclarationMock).toHaveBeenCalledOnce();
      }),
    );

    it.effect(
      'should delegate property signature to its own visitor',
      Effect.fnUntraced(function* () {
        const syntaxList = createSyntaxList({
          getChildren: () => [createPropertySignature()],
        });
        const syntaxListVisitor = yield* SyntaxListVisitor;

        yield* syntaxListVisitor
          .visit(syntaxList)
          .pipe(Effect.provide(TestLayer));

        expect(visitPropertySignatureMock).toHaveBeenCalledOnce();
      }),
    );

    it.effect(
      'should fail with GetNodeChildrenError if syntaxList.getChildren fails',
      Effect.fnUntraced(function* () {
        const error = new Error('error');
        const syntaxList = createSyntaxList({
          getChildren: () => {
            throw error;
          },
        });
        const syntaxListVisitor = yield* SyntaxListVisitor;

        const result = yield* syntaxListVisitor
          .visit(syntaxList)
          .pipe(Effect.flip, Effect.provide(TestLayer));

        expect(result).toBeInstanceOf(GetNodeChildrenError);
        expect(result.cause).toBe(error);
      }),
    );

    it.effect(
      'should succeed with empty array if visiting empty syntax list',
      Effect.fnUntraced(function* () {
        const emptySyntaxList = createSyntaxList({
          getChildren: () => [],
        });
        const syntaxListVisitor = yield* SyntaxListVisitor;

        const result = yield* syntaxListVisitor
          .visit(emptySyntaxList)
          .pipe(Effect.provide(TestLayer));

        expect(result).toHaveLength(0);
      }),
    );
  });
});
