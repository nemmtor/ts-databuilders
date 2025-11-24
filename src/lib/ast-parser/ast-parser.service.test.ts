import type { PlatformError } from '@effect/platform/Error';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import {
  createSourceFile,
  createTypeChecker,
} from '../typescript/__test-utils__';
import { TypescriptProject } from '../typescript/typescript-project.layer';
import { TypescriptUtils } from '../typescript/typescript-utils.service';
import { ASTParser } from './ast-parser.service';
import {
  createTestVisitorLayer,
  visitSourceFile,
} from './visitors/__test-utils__';

const fsReadFileStringMock = vi.fn<
  () => Effect.Effect<string, PlatformError, never>
>(() => Effect.succeed(''));

const TestLayer = ASTParser.Default.pipe(
  Layer.provide(
    FileSystem.layerNoop({
      readFileString: fsReadFileStringMock,
    }),
  ),
  Layer.provide(TypescriptUtils.Default),
  Layer.provide(Path.layer),
);

const visitSourceFileMock = vi.fn(() => visitSourceFile);
const parseLayer = Layer.provideMerge(
  createTestVisitorLayer({ visitSourceFile: visitSourceFileMock }),
  Layer.succeed(
    TypescriptProject,
    TypescriptProject.of({
      sourceFile: createSourceFile(),
      typeChecker: createTypeChecker(),
    }),
  ),
);

describe('ASTParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TestLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const astParser = yield* ASTParser;

        expect(astParser).toBeDefined();
      }),
    );

    it.effect(
      'should delegate source file to its own visitor',
      Effect.fnUntraced(function* () {
        const astParser = yield* ASTParser;
        yield* astParser.parseWithoutDependencies.pipe(
          Effect.provide(parseLayer),
        );

        expect(visitSourceFileMock).toHaveBeenCalledOnce();
      }),
    );

    it.effect(
      'should create project and parse with dependencies',
      Effect.fnUntraced(function* () {
        const astParser = yield* ASTParser;

        const result = yield* astParser.parse(
          'src/lib/ast-parser/ast-parser.service.ts',
        );

        expect(result).toBeDefined();
        expect(result.fileName).toContain('ast-parser.service.ts');
      }),
    );
  });
});
