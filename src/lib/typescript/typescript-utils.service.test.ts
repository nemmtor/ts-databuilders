import * as Path from '@effect/platform/Path';
import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as ts from './typescript';
import {
  CreateProjectError,
  GetTSConfigError,
  SourceFileNotFoundError,
  TSConfigNotFoundError,
} from './typescript.errors';
import { TypescriptUtils } from './typescript-utils.service';

const TestLayer = TypescriptUtils.Default.pipe(Layer.provide(Path.layer));

describe('TypescriptUtils', () => {
  describe('getTsConfig', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it.layer(TestLayer)((it) => {
      it.effect(
        'should be successfully instantiated',
        Effect.fnUntraced(function* () {
          const tsUtils = yield* TypescriptUtils;

          expect(tsUtils).toBeDefined();
        }),
      );

      it.effect(
        'should fail with GetTSConfigError if ts.findConfigFile fails',
        Effect.fnUntraced(function* () {
          const error = new Error();
          vi.spyOn(ts, 'findConfigFile').mockImplementationOnce(() => {
            throw error;
          });
          const tsUtils = yield* TypescriptUtils;

          const result = yield* tsUtils.getTsConfig('').pipe(Effect.flip);

          expect(result).toBeInstanceOf(GetTSConfigError);
          expect(result.cause).toEqual(error);
        }),
      );

      it.effect(
        'should fail with TSConfigNotFoundError if tsconfig is not found',
        Effect.fnUntraced(function* () {
          vi.spyOn(ts, 'findConfigFile').mockReturnValueOnce(undefined);
          const tsUtils = yield* TypescriptUtils;

          const result = yield* tsUtils.getTsConfig('').pipe(Effect.flip);

          expect(result).toBeInstanceOf(TSConfigNotFoundError);
        }),
      );

      it.effect(
        'should fail with GetTSConfigError if ts.readConfigFile fails',
        Effect.fnUntraced(function* () {
          vi.spyOn(ts, 'findConfigFile').mockReturnValueOnce('file.ts');
          const tsDiagnosticError = {
            category: 0,
            code: 1,
            messageText: '',
            file: undefined,
            start: undefined,
            length: undefined,
          };
          vi.spyOn(ts, 'readConfigFile').mockReturnValueOnce({
            error: tsDiagnosticError,
          });
          const tsUtils = yield* TypescriptUtils;

          const result = yield* tsUtils.getTsConfig('').pipe(Effect.flip);

          expect(result).toBeInstanceOf(GetTSConfigError);
          expect(result.cause).toEqual(tsDiagnosticError);
        }),
      );

      it.effect(
        'should fail with GetTSConfigError if ts.parseJsonConfigFileContent fails',
        Effect.fnUntraced(function* () {
          const error = new Error();
          vi.spyOn(ts, 'readConfigFile').mockReturnValueOnce({ config: {} });
          vi.spyOn(ts, 'findConfigFile').mockReturnValueOnce('file.ts');
          vi.spyOn(ts, 'parseJsonConfigFileContent').mockImplementationOnce(
            () => {
              throw error;
            },
          );
          const tsUtils = yield* TypescriptUtils;

          const result = yield* tsUtils.getTsConfig('').pipe(Effect.flip);

          expect(result).toBeInstanceOf(GetTSConfigError);
          expect(result.cause).toEqual(error);
        }),
      );
    });
  });

  describe('createProject', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it.layer(TestLayer)((it) => {
      it.effect(
        'shiuld succeed with typeChecker and SourceFile',
        Effect.fnUntraced(function* () {
          vi.spyOn(ts, 'readConfigFile').mockReturnValueOnce({ config: {} });
          vi.spyOn(ts, 'findConfigFile').mockReturnValueOnce('file.ts');
          vi.spyOn(ts, 'parseJsonConfigFileContent').mockReturnValueOnce({
            options: {},
            fileNames: [],
            errors: [],
          });
          const typeChecker = { kind: 'typeChecker' };
          const sourceFile = { kind: 'sourceFile' };
          vi.spyOn(ts, 'createProgram').mockReturnValueOnce({
            getTypeChecker: () => typeChecker,
            getSourceFile: () => sourceFile,
          } as unknown as ReturnType<typeof ts.createProgram>);
          const tsUtils = yield* TypescriptUtils;

          const result = yield* tsUtils.createProject('');

          expect(result.sourceFile).toBe(sourceFile);
          expect(result.typeChecker).toBe(typeChecker);
        }),
      );

      it.effect(
        'should fail with CreateProjectError if ts.createProgram fails',
        Effect.fnUntraced(function* () {
          vi.spyOn(ts, 'readConfigFile').mockReturnValueOnce({ config: {} });
          vi.spyOn(ts, 'findConfigFile').mockReturnValueOnce('file.ts');
          vi.spyOn(ts, 'parseJsonConfigFileContent').mockReturnValueOnce({
            options: {},
            fileNames: [],
            errors: [],
          });
          const error = new Error();
          vi.spyOn(ts, 'createProgram').mockImplementationOnce(() => {
            throw error;
          });
          const tsUtils = yield* TypescriptUtils;

          const result = yield* tsUtils.createProject('').pipe(Effect.flip);

          expect(result).toBeInstanceOf(CreateProjectError);
          expect(result.cause).toEqual(error);
        }),
      );

      it.effect(
        'should fail with CreateProjectError if ts.getTypeChecker fails',
        Effect.fnUntraced(function* () {
          vi.spyOn(ts, 'readConfigFile').mockReturnValueOnce({ config: {} });
          vi.spyOn(ts, 'findConfigFile').mockReturnValueOnce('file.ts');
          vi.spyOn(ts, 'parseJsonConfigFileContent').mockReturnValueOnce({
            options: {},
            fileNames: [],
            errors: [],
          });
          const error = new Error();
          vi.spyOn(ts, 'createProgram').mockReturnValueOnce({
            getTypeChecker: () => {
              throw error;
            },
          } as unknown as ReturnType<typeof ts.createProgram>);
          const tsUtils = yield* TypescriptUtils;

          const result = yield* tsUtils.createProject('').pipe(Effect.flip);

          expect(result).toBeInstanceOf(CreateProjectError);
          expect(result.cause).toEqual(error);
        }),
      );

      it.effect(
        'should fail with CreateProjectError if ts.getSourceFile fails',
        Effect.fnUntraced(function* () {
          vi.spyOn(ts, 'readConfigFile').mockReturnValueOnce({ config: {} });
          vi.spyOn(ts, 'findConfigFile').mockReturnValueOnce('file.ts');
          vi.spyOn(ts, 'parseJsonConfigFileContent').mockReturnValueOnce({
            options: {},
            fileNames: [],
            errors: [],
          });
          const error = new Error();
          vi.spyOn(ts, 'createProgram').mockReturnValueOnce({
            getTypeChecker: vi.fn(),
            getSourceFile: () => {
              throw error;
            },
          } as unknown as ReturnType<typeof ts.createProgram>);
          const tsUtils = yield* TypescriptUtils;

          const result = yield* tsUtils.createProject('').pipe(Effect.flip);

          expect(result).toBeInstanceOf(CreateProjectError);
          expect(result.cause).toEqual(error);
        }),
      );

      it.effect(
        'should fail with SourceFileNotFoundError if ts.getSourceFile returns undefined',
        Effect.fnUntraced(function* () {
          vi.spyOn(ts, 'readConfigFile').mockReturnValueOnce({ config: {} });
          vi.spyOn(ts, 'findConfigFile').mockReturnValueOnce('file.ts');
          vi.spyOn(ts, 'parseJsonConfigFileContent').mockReturnValueOnce({
            options: {},
            fileNames: [],
            errors: [],
          });
          vi.spyOn(ts, 'createProgram').mockReturnValueOnce({
            getTypeChecker: vi.fn(),
            getSourceFile: () => undefined,
          } as unknown as ReturnType<typeof ts.createProgram>);
          const tsUtils = yield* TypescriptUtils;

          const result = yield* tsUtils.createProject('').pipe(Effect.flip);

          expect(result).toBeInstanceOf(SourceFileNotFoundError);
        }),
      );
    });
  });
});
