import { Option } from 'effect';

import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import {
  createPropertySignature,
  createTestTypescriptProjectLayer,
} from '../../typescript/__test-utils__';
import * as ts from '../../typescript/typescript';
import { createTestVisitorLayer, visitTypeNode } from './__test-utils__';
import { PropertySignatureVisitorLayer } from './property-signature-visitor.layer';
import { PropertySignatureVisitor } from './visitor';
import { MissingPropertySignatureTypeNodeError } from './visitor.errors';
import * as VisitorUtil from './visitor.utils';

const visitTypeNodeMock = vi.fn(() => visitTypeNode);

const TestLayer = createTestVisitorLayer({
  visitTypeNode: visitTypeNodeMock,
}).pipe(Layer.merge(createTestTypescriptProjectLayer()));

describe('PropertySignatureVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(PropertySignatureVisitorLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const propertySignatureVisitor = yield* PropertySignatureVisitor;

        expect(propertySignatureVisitor).toBeDefined();
      }),
    );

    it.effect(
      'should succeed with correct data',
      Effect.fnUntraced(function* () {
        const propertySignatureVisitor = yield* PropertySignatureVisitor;
        const propertySignature = createPropertySignature({
          name: { getText: () => 'test' },
          type: {
            kind: ts.SyntaxKind.StringKeyword,
          },
        });

        const result = yield* propertySignatureVisitor
          .visit(propertySignature)
          .pipe(Effect.provide(TestLayer));

        expect(result.pipe(Option.getOrUndefined)).toEqual(
          expect.objectContaining({
            kind: ts.SyntaxKind.PropertySignature,
            identifier: 'test',
            hasQuestionToken: false,
            jsDocTagsNames: [],
          }),
        );
      }),
    );

    it.effect(
      'should succeed with correct identifier for synthetic node',
      Effect.fnUntraced(function* () {
        const propertySignatureVisitor = yield* PropertySignatureVisitor;
        const propertySignature = createPropertySignature({
          name: { escapedText: 'test' },
          type: {
            kind: ts.SyntaxKind.StringKeyword,
          },
        });

        const result = yield* propertySignatureVisitor
          .visit(propertySignature)
          .pipe(Effect.provide(TestLayer));

        expect(result.pipe(Option.getOrUndefined)).toEqual(
          expect.objectContaining({
            identifier: 'test',
          }),
        );
      }),
    );

    it.effect(
      'should return information about question token',
      Effect.fnUntraced(function* () {
        const propertySignatureVisitor = yield* PropertySignatureVisitor;
        const propertySignature = createPropertySignature({
          name: { getText: () => 'test' },
          questionToken: {},
          type: {
            kind: ts.SyntaxKind.StringKeyword,
          },
        });

        const result = yield* propertySignatureVisitor
          .visit(propertySignature)
          .pipe(Effect.provide(TestLayer));

        expect(result.pipe(Option.getOrUndefined)).toEqual(
          expect.objectContaining({
            hasQuestionToken: true,
          }),
        );
      }),
    );

    it.effect(
      'should return jsdoc tags',
      Effect.fnUntraced(function* () {
        vi.spyOn(VisitorUtil, 'getJsDocTagsNames').mockReturnValueOnce(
          Effect.succeed(['test']),
        );
        const propertySignatureVisitor = yield* PropertySignatureVisitor;
        const propertySignature = createPropertySignature({
          type: {
            kind: ts.SyntaxKind.StringKeyword,
          },
        });

        const result = yield* propertySignatureVisitor
          .visit(propertySignature)
          .pipe(Effect.provide(TestLayer));

        expect(result.pipe(Option.getOrUndefined)).toEqual(
          expect.objectContaining({
            jsDocTagsNames: ['test'],
          }),
        );
      }),
    );

    it.effect(
      'should delegate type node to its own visitor',
      Effect.fnUntraced(function* () {
        const propertySignatureVisitor = yield* PropertySignatureVisitor;
        const propertySignature = createPropertySignature({
          type: {
            kind: ts.SyntaxKind.StringKeyword,
          },
        });

        yield* propertySignatureVisitor
          .visit(propertySignature)
          .pipe(Effect.provide(TestLayer));

        expect(visitTypeNodeMock).toHaveBeenCalledOnce();
      }),
    );

    it.effect(
      'should succeed with none if type node visitor returns none',
      Effect.fnUntraced(function* () {
        visitTypeNodeMock.mockReturnValueOnce(Effect.succeed(Option.none()));
        const propertySignatureVisitor = yield* PropertySignatureVisitor;
        const propertySignature = createPropertySignature({
          type: {
            kind: ts.SyntaxKind.StringKeyword,
          },
        });

        const result = yield* propertySignatureVisitor
          .visit(propertySignature)
          .pipe(Effect.provide(TestLayer));

        expect(result.pipe(Option.isNone)).toBe(true);
      }),
    );

    it.effect(
      'should fail with MissingPropertySignatureTypeNodeError if type node is missing',
      Effect.fnUntraced(function* () {
        const propertySignature = createPropertySignature({
          name: { getText: (): string => 'test' },
        });
        const propertySignatureVisitor = yield* PropertySignatureVisitor;

        const result = yield* propertySignatureVisitor
          .visit(propertySignature)
          .pipe(Effect.flip, Effect.provide(TestLayer));

        expect(result).toBeInstanceOf(MissingPropertySignatureTypeNodeError);
      }),
    );
  });
});
