import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as ts from '../typescript';
import { TypeLiteralVisitor } from './type-literal-visitor.service';

const TestLayer = TypeLiteralVisitor.Default;

describe('TypeLiteralVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TestLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const typeLiteralVisitor = yield* TypeLiteralVisitor;

        expect(typeLiteralVisitor).toBeDefined();
      }),
    );

    it.effect(
      'scratchpad',
      Effect.fnUntraced(function* () {
        const typeLiteral = getTypeLiteral('type Foo = {};');
        const typeLiteralVisitor = yield* TypeLiteralVisitor;

        yield* typeLiteralVisitor.visit(typeLiteral);

        expect(typeLiteralVisitor).toBeDefined();
      }),
    );
  });
});

function getTypeLiteral(sourceCode: string): ts.TypeLiteralNode {
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
  if (!ts.isTypeLiteralNode(maybeTypeAliasDeclaration.type)) {
    throw new Error('Expected type literal');
  }

  return maybeTypeAliasDeclaration.type;
}
