import { Option } from 'effect';

import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import {
  createArrayTypeNode,
  createTestTypescriptProjectLayer,
  createTypeLiteralNode,
  createTypeNode,
  createTypeReferenceNode,
  createUnionTypeNode,
} from '../../typescript/__test-utils__';
import * as ts from '../../typescript/typescript';
import {
  createTestVisitorLayer,
  visitArrayType,
  visitBuiltinOpaqueType,
  visitLiteralType,
  visitPrimitiveKeyword,
  visitTypeLiteral,
  visitUnionType,
} from './__test-utils__';
import { TypeNodeVisitorLayer } from './type-node-visitor.layer';
import { TypeNodeVisitor } from './visitor';

const visitPrimitiveKeywordMock = vi.fn(() => visitPrimitiveKeyword);
const visitLiteralTypeMock = vi.fn(() => visitLiteralType);
const visitBuiltinOpaqueTypeMock = vi.fn(() => visitBuiltinOpaqueType);
const visitArrayTypeMock = vi.fn(() => visitArrayType);
const visitTypeLiteralMock = vi.fn(() => visitTypeLiteral);
const visitUnionTypeMock = vi.fn(() => visitUnionType);

const TestLayer = createTestVisitorLayer({
  visitPrimitiveKeyword: visitPrimitiveKeywordMock,
  visitLiteralType: visitLiteralTypeMock,
  visitBuiltinOpaqueType: visitBuiltinOpaqueTypeMock,
  visitArrayType: visitArrayTypeMock,
  visitTypeLiteral: visitTypeLiteralMock,
  visitUnionType: visitUnionTypeMock,
}).pipe(Layer.merge(createTestTypescriptProjectLayer()));

describe('TypeNodeVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TypeNodeVisitorLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const typeNodeVisitor = yield* TypeNodeVisitor;

        expect(typeNodeVisitor).toBeDefined();
      }),
    );

    it.effect.each([
      {
        case: 'primitive keyword',
        typeNode: createTypeNode({
          kind: ts.SyntaxKind.StringKeyword,
        }),
        mock: visitPrimitiveKeywordMock,
      },
      {
        case: 'literal type',
        typeNode: createTypeNode({ kind: ts.SyntaxKind.LiteralType }),
        mock: visitLiteralTypeMock,
      },
      ...ts.BUILTIN_OPAQUE_TYPES.flatMap((v) => ({
        case: `${v} builtin opaque type`,
        typeNode: createTypeReferenceNode({
          typeName: {
            getText: () => v,
          },
        }),
        mock: visitBuiltinOpaqueTypeMock,
      })),
      {
        case: 'array type',
        typeNode: createArrayTypeNode(),
        mock: visitArrayTypeMock,
      },
      {
        case: 'type literal',
        typeNode: createTypeLiteralNode(),
        mock: visitTypeLiteralMock,
      },
      {
        case: 'union type',
        typeNode: createUnionTypeNode(),
        mock: visitUnionTypeMock,
      },
    ])(
      'should delegate $case to its own visitor',
      Effect.fnUntraced(function* ({ mock, typeNode }) {
        const typeNodeVisitor = yield* TypeNodeVisitor;

        yield* typeNodeVisitor.visit(typeNode).pipe(Effect.provide(TestLayer));

        expect(mock).toHaveBeenCalledOnce();
      }),
    );

    it.effect(
      'should succeed with none if type node has unsupported kind',
      Effect.fnUntraced(function* () {
        const propertySignature = createTypeNode({
          kind: ts.SyntaxKind.ClassKeyword,
        });
        const typeNodeVisitor = yield* TypeNodeVisitor;

        const result = yield* typeNodeVisitor
          .visit(propertySignature)
          .pipe(Effect.provide(TestLayer));

        expect(result.pipe(Option.isNone)).toBe(true);
      }),
    );
  });
});
