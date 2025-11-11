import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as ts from '../typescript';
import { SyntaxListVisitor } from './syntax-list-visitor.service';
import { TypeAliasDeclarationVisitor } from './type-alias-declaration-visitor.service';
import { GetNodeChildrenError } from './visitor.errors';

const visitTypeAliasDeclarationMock = vi.fn(() =>
  Effect.succeed('TODO: some default'),
);

const TestLayer = SyntaxListVisitor.DefaultWithoutDependencies.pipe(
  Layer.provide([
    Layer.succeed(
      TypeAliasDeclarationVisitor,
      TypeAliasDeclarationVisitor.make({
        visit: visitTypeAliasDeclarationMock,
      }),
    ),
  ]),
);

describe('SyntaxListVisitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TestLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const syntaxListVisitor = yield* SyntaxListVisitor;

        expect(syntaxListVisitor).toBeDefined();
      }),
    );

    it.effect.each([
      {
        case: 'single type',
        sourceCode: 'type TypeAlias = { stringField: string; };',
        expectedLength: 1,
      },
      {
        case: 'multiple types',
        sourceCode: [
          'type TypeAlias = { stringField: string; };',
          'type TypeAlias2 = { stringField: string; };',
        ].join('\n'),
        expectedLength: 2,
      },
    ])(
      'should return result of visiting syntax list with $case',
      Effect.fnUntraced(function* ({ sourceCode, expectedLength }) {
        const syntaxList = getSyntaxList(sourceCode);
        const syntaxListVisitor = yield* SyntaxListVisitor;

        const result = yield* syntaxListVisitor.visit(syntaxList);

        expect(result).toHaveLength(expectedLength);
      }),
    );

    it.effect.each([
      {
        case: 'class',
        sourceCode: 'class TestClass {}',
      },
      {
        case: 'interface',
        sourceCode: 'interface TestInterface {}',
      },
      {
        case: 'enum',
        sourceCode: 'enum TestEnum {}',
      },
    ])(
      'should ignore unsupported syntax kind node of $case',
      Effect.fnUntraced(function* ({ sourceCode }) {
        const syntaxList = getSyntaxList(sourceCode);
        const syntaxListVisitor = yield* SyntaxListVisitor;

        const result = yield* syntaxListVisitor.visit(syntaxList);

        expect(result).toHaveLength(0);
      }),
    );

    it.effect(
      'should delegate type alias declaration to type alias declaration visitor',
      Effect.fnUntraced(function* () {
        const syntaxList = getSyntaxList(
          'type TypeAlias = { stringField: string; };',
        );
        const syntaxListVisitor = yield* SyntaxListVisitor;

        yield* syntaxListVisitor.visit(syntaxList);

        expect(visitTypeAliasDeclarationMock).toHaveBeenCalledOnce();
      }),
    );

    it.effect(
      'should fail with GetNodeChildrenError if syntaxList.getChildren fails',
      Effect.fnUntraced(function* () {
        const syntaxList = getSyntaxList(
          'type TypeAlias = { stringField: string; };',
        );
        const error = new Error('error');
        vi.spyOn(syntaxList, 'getChildren').mockImplementationOnce(() => {
          throw error;
        });
        const syntaxListVisitor = yield* SyntaxListVisitor;

        const result = yield* syntaxListVisitor
          .visit(syntaxList)
          .pipe(Effect.flip);

        expect(result).toBeInstanceOf(GetNodeChildrenError);
        expect(result.cause).toBe(error);
      }),
    );
  });
});

function getSyntaxList(sourceCode: string): ts.SyntaxList {
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

  return maybeSyntaxList;
}
