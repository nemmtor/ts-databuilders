import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as ts from '../typescript';
import { SourceFileVisitor } from './source-file-visitor.service';
import { SyntaxListVisitor } from './syntax-list-visitor.service';
import {
  GetNodeChildrenError,
  MissingSyntaxListNodeInSourceFileError,
} from './visitor.errors';

const visitSyntaxListMock = vi.fn(() => Effect.succeed([]));

const TestLayer = SourceFileVisitor.DefaultWithoutDependencies.pipe(
  Layer.provide([
    Layer.succeed(
      SyntaxListVisitor,
      SyntaxListVisitor.make({
        visit: visitSyntaxListMock,
      }),
    ),
  ]),
);

describe('SourceFileVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TestLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const sourceFileVisitor = yield* SourceFileVisitor;

        expect(sourceFileVisitor).toBeDefined();
      }),
    );

    it.effect(
      'should delegate syntax list to syntax list visitor',
      Effect.fnUntraced(function* () {
        const sourceFile = getSourceFile();
        const sourceFileVisitor = yield* SourceFileVisitor;

        yield* sourceFileVisitor.visit(sourceFile);

        expect(visitSyntaxListMock).toHaveBeenCalledOnce();
      }),
    );

    it.effect(
      'should fail with GetNodeChildrenError if sourceFile.getChildren fails',
      Effect.fnUntraced(function* () {
        const sourceFile = getSourceFile();
        const error = new Error('error');
        vi.spyOn(sourceFile, 'getChildren').mockImplementationOnce(() => {
          throw error;
        });
        const sourceFileVisitor = yield* SourceFileVisitor;

        const result = yield* sourceFileVisitor
          .visit(sourceFile)
          .pipe(Effect.flip);

        expect(result).toBeInstanceOf(GetNodeChildrenError);
        expect(result.cause).toBe(error);
      }),
    );

    it.effect(
      'should fail with MissingSyntaxListNodeInSourceFileError if syntaxListNode does not exist',
      Effect.fnUntraced(function* () {
        const sourceFile = getSourceFile();
        vi.spyOn(sourceFile, 'getChildren').mockReturnValueOnce([]);
        const sourceFileVisitor = yield* SourceFileVisitor;

        const result = yield* sourceFileVisitor
          .visit(sourceFile)
          .pipe(Effect.flip);

        expect(result).toBeInstanceOf(MissingSyntaxListNodeInSourceFileError);
      }),
    );

    it.effect(
      'should fail with GetNodeChildrenError if syntaxListNode.getChildren fails',
      Effect.fnUntraced(function* () {
        const sourceFile = getSourceFile();
        const error = new Error('error');
        vi.spyOn(sourceFile, 'getChildren').mockImplementationOnce(() => {
          throw error;
        });
        const sourceFileVisitor = yield* SourceFileVisitor;

        const result = yield* sourceFileVisitor
          .visit(sourceFile)
          .pipe(Effect.flip);

        expect(result).toBeInstanceOf(GetNodeChildrenError);
        expect(result.cause).toBe(error);
      }),
    );
  });
});

function getSourceFile(): ts.SourceFile {
  return ts.createSourceFile('a.ts', '', ts.ScriptTarget.Latest, true);
}
