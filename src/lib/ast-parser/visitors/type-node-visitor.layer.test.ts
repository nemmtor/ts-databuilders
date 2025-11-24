import { Option } from 'effect';

import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import {
  createArrayTypeNode,
  createTestTypescriptProjectLayer,
  createTupleTypeNode,
  createTypeChecker,
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
  visitTupleType,
  visitTypeLiteral,
  visitUnionType,
} from './__test-utils__';
import { TypeNodeVisitorLayer } from './type-node-visitor.layer';
import { TypeNodeVisitor } from './visitor';
import { CannotCreateSyntheticTypeNodeError } from './visitor.errors';

const visitPrimitiveKeywordMock = vi.fn(() => visitPrimitiveKeyword);
const visitLiteralTypeMock = vi.fn(() => visitLiteralType);
const visitBuiltinOpaqueTypeMock = vi.fn(() => visitBuiltinOpaqueType);
const visitArrayTypeMock = vi.fn(() => visitArrayType);
const visitTypeLiteralMock = vi.fn(() => visitTypeLiteral);
const visitUnionTypeMock = vi.fn(() => visitUnionType);
const visitTupleTypeMock = vi.fn(() => visitTupleType);
const visitTypeNodeMock = vi.fn();
const getTypeAtLocationMock = vi.fn().mockReturnValue({});
const typeToTypeNodeMock = vi.fn();

const TestLayer = createTestVisitorLayer({
  visitPrimitiveKeyword: visitPrimitiveKeywordMock,
  visitLiteralType: visitLiteralTypeMock,
  visitBuiltinOpaqueType: visitBuiltinOpaqueTypeMock,
  visitArrayType: visitArrayTypeMock,
  visitTypeLiteral: visitTypeLiteralMock,
  visitUnionType: visitUnionTypeMock,
  visitTupleType: visitTupleTypeMock,
  visitTypeNode: visitTypeNodeMock,
}).pipe(
  Layer.merge(
    createTestTypescriptProjectLayer({
      typeChecker: createTypeChecker({
        getTypeAtLocation: getTypeAtLocationMock,
        typeToTypeNode: typeToTypeNodeMock,
      }),
    }),
  ),
);

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
      {
        case: 'tuple type',
        typeNode: createTupleTypeNode(),
        mock: visitTupleTypeMock,
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

    it.effect(
      'should handle TypeReferenceNode with valid synthetic node',
      Effect.fnUntraced(function* () {
        const syntheticNode = createTypeNode({
          kind: ts.SyntaxKind.StringKeyword,
        });
        const expectedInlineType = {
          kind: ts.SyntaxKind.StringKeyword,
        };
        typeToTypeNodeMock.mockReturnValue(syntheticNode);
        visitTypeNodeMock.mockReturnValue(
          Effect.succeed(Option.some(expectedInlineType)),
        );
        const typeReferenceNode = createTypeReferenceNode({
          typeName: { getText: () => 'CustomType' },
        });
        const typeNodeVisitor = yield* TypeNodeVisitor;

        const result = yield* typeNodeVisitor
          .visit(typeReferenceNode)
          .pipe(Effect.provide(TestLayer));

        expect(Option.isSome(result)).toBe(true);
        expect(Option.getOrThrow(result)).toEqual({
          kind: ts.SyntaxKind.TypeReference,
          inlineType: expectedInlineType,
          referenceName: 'CustomType',
        });
      }),
    );

    it.effect(
      'should fail with CannotCreateSyntheticTypeNodeError when typeToTypeNode returns undefined',
      Effect.fnUntraced(function* () {
        typeToTypeNodeMock.mockReturnValue(undefined);
        const typeReferenceNode = createTypeReferenceNode({
          typeName: { getText: () => 'CustomType' },
        });
        const typeNodeVisitor = yield* TypeNodeVisitor;

        const result = yield* typeNodeVisitor
          .visit(typeReferenceNode)
          .pipe(Effect.flip, Effect.provide(TestLayer));

        expect(result).toBeInstanceOf(CannotCreateSyntheticTypeNodeError);
      }),
    );

    it.effect(
      'should return None when recursive visit returns None',
      Effect.fnUntraced(function* () {
        const syntheticNode = createTypeNode({
          kind: ts.SyntaxKind.StringKeyword,
        });
        typeToTypeNodeMock.mockReturnValue(syntheticNode);
        visitTypeNodeMock.mockReturnValue(Effect.succeed(Option.none()));
        const typeReferenceNode = createTypeReferenceNode({
          typeName: { getText: () => 'CustomType' },
        });
        const typeNodeVisitor = yield* TypeNodeVisitor;

        const result = yield* typeNodeVisitor
          .visit(typeReferenceNode)
          .pipe(Effect.provide(TestLayer));

        expect(Option.isNone(result)).toBe(true);
      }),
    );
  });
});
