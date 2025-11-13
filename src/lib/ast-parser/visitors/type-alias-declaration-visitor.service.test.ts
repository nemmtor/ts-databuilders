import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as ts from '../typescript';
import { TypeAliasDeclarationVisitor } from './type-alias-declaration-visitor.service';
import { TypeLiteralVisitor } from './type-literal-visitor.service';

const visitTypeLiteralMock = vi.fn(() => Effect.succeed('TODO: some default'));

const TestLayer = TypeAliasDeclarationVisitor.DefaultWithoutDependencies.pipe(
  Layer.provide([
    Layer.succeed(
      TypeLiteralVisitor,
      TypeLiteralVisitor.make({ visit: visitTypeLiteralMock }),
    ),
  ]),
);

describe('TypeAliasDeclarationVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TestLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const typeAliastDeclarationVisitor = yield* TypeAliasDeclarationVisitor;

        expect(typeAliastDeclarationVisitor).toBeDefined();
      }),
    );

    it.effect.only(
      'should delegate type literal to type literal visitor',
      Effect.fnUntraced(function* () {
        const typeAliasDeclaration = getTypeAliasDeclaration(
          'type TypeAliasDeclaration = {};',
        );
        const typeAliastDeclarationVisitor = yield* TypeAliasDeclarationVisitor;
        yield* typeAliastDeclarationVisitor.visit(typeAliasDeclaration);

        expect(visitTypeLiteralMock).toHaveBeenCalled();
      }),
    );
  });
});

function getTypeAliasDeclaration(sourceCode: string): ts.TypeAliasDeclaration {
  const sourceFile = ts.createSourceFile(
    'a.ts',
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
  );

  const maybeSyntaxList = sourceFile
    .getChildren()
    .find(
      (node): node is ts.SyntaxList => node.kind === ts.SyntaxKind.SyntaxList,
    );
  if (!maybeSyntaxList) {
    throw new Error('Expected syntax list');
  }

  const maybeTypeAliasDeclaration = maybeSyntaxList
    .getChildren()
    .find((node) => ts.isTypeAliasDeclaration(node));
  if (!maybeTypeAliasDeclaration) {
    throw new Error('Expected type alias declaration');
  }

  return maybeTypeAliasDeclaration;
}
