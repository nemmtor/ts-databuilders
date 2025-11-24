import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import {
  createSourceFile,
  createSyntaxList,
  createTestTypescriptProjectLayer,
} from '../../typescript/__test-utils__';
import { createTestVisitorLayer, visitSyntaxList } from './__test-utils__';
import { SourceFileVisitorLayer } from './source-file-visitor.layer';
import { SourceFileVisitor } from './visitor';
import {
  GetNodeChildrenError,
  MissingSyntaxListNodeInSourceFileError,
} from './visitor.errors';

const visitSyntaxListMock = vi.fn(() => visitSyntaxList);

const TestLayer = createTestVisitorLayer({
  visitSyntaxList: visitSyntaxListMock,
}).pipe(Layer.merge(createTestTypescriptProjectLayer()));

describe('SourceFileVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(SourceFileVisitorLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const sourceFileVisitor = yield* SourceFileVisitor;

        expect(sourceFileVisitor).toBeDefined();
      }),
    );

    it.effect(
      'should delegate syntax list to its own visitor',
      Effect.fnUntraced(function* () {
        const sourceFile = createSourceFile({
          getChildren: () => [createSyntaxList()],
        });
        const sourceFileVisitor = yield* SourceFileVisitor;

        yield* sourceFileVisitor
          .visit(sourceFile)
          .pipe(Effect.provide(TestLayer));

        expect(visitSyntaxListMock).toHaveBeenCalledOnce();
      }),
    );

    it.effect(
      'should fail with GetNodeChildrenError if sourceFile.getChildren fails',
      Effect.fnUntraced(function* () {
        const error = new Error('error');
        const sourceFile = createSourceFile({
          getChildren: () => {
            throw error;
          },
        });
        const sourceFileVisitor = yield* SourceFileVisitor;

        const result = yield* sourceFileVisitor
          .visit(sourceFile)
          .pipe(Effect.flip, Effect.provide(TestLayer));

        expect(result).toBeInstanceOf(GetNodeChildrenError);
        expect(result.cause).toBe(error);
      }),
    );

    it.effect(
      'should fail with MissingSyntaxListNodeInSourceFileError if syntaxListNode does not exist',
      Effect.fnUntraced(function* () {
        const sourceFile = createSourceFile({ getChildren: () => [] });
        const sourceFileVisitor = yield* SourceFileVisitor;

        const result = yield* sourceFileVisitor
          .visit(sourceFile)
          .pipe(Effect.flip, Effect.provide(TestLayer));

        expect(result).toBeInstanceOf(MissingSyntaxListNodeInSourceFileError);
      }),
    );
  });
});
