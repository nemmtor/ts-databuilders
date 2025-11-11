import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import {
  createTypeAliasDeclaration,
  createTypeLiteralNode,
} from '../../typescript/__test-utils__';
import * as ts from '../../typescript/typescript';
import { createTestVisitorLayer, visitTypeLiteral } from './__test-utils__';
import { TypeAliasDeclarationVisitorLayer } from './type-alias-declaration-visitor.layer';
import { TypeAliasDeclarationVisitor } from './visitor';

const visitTypeLiteralMock = vi.fn(() => visitTypeLiteral);
const TestLayer = createTestVisitorLayer({
  visitTypeLiteral: visitTypeLiteralMock,
});

describe('TypeAliasDeclarationVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TypeAliasDeclarationVisitorLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const typeAliastDeclarationVisitor = yield* TypeAliasDeclarationVisitor;

        expect(typeAliastDeclarationVisitor).toBeDefined();
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'should delegate type literal to its own visitor',
      Effect.fnUntraced(function* () {
        const typeAliasDeclaration = createTypeAliasDeclaration({
          name: { getText: () => 'test' },
          type: createTypeLiteralNode(),
        });
        const typeAliastDeclarationVisitor = yield* TypeAliasDeclarationVisitor;
        yield* typeAliastDeclarationVisitor
          .visit(typeAliasDeclaration)
          .pipe(Effect.provide(TestLayer));

        expect(visitTypeLiteralMock).toHaveBeenCalled();
      }),
    );

    it.effect(
      'should succeed with none if node type has unsupported kind',
      Effect.fnUntraced(function* () {
        const typeAliasDeclaration = createTypeAliasDeclaration({
          name: { getText: () => 'test' },
          type: { kind: ts.SyntaxKind.CloseBracketToken },
        });
        const typeAliastDeclarationVisitor = yield* TypeAliasDeclarationVisitor;
        const result = yield* typeAliastDeclarationVisitor
          .visit(typeAliasDeclaration)
          .pipe(Effect.provide(TestLayer));

        expect(result.pipe(Option.isNone)).toBe(true);
      }),
    );
  });
});
