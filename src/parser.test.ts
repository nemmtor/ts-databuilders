import * as FileSystem from '@effect/platform/FileSystem';
import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { Configuration, DEFAULT_CONFIGURATION } from './configuration';
import { type DataBuilderMetadata, Parser, TypeNodeParser } from './parser';

const fsReadFileStringMock = vi.fn(() => Effect.succeed('hi'));

const TestLayer = Parser.DefaultWithoutDependencies.pipe(
  Layer.provide(
    FileSystem.layerNoop({
      readFileString: fsReadFileStringMock,
    }),
  ),
  Layer.provide(TypeNodeParser.Default),
  Layer.provideMerge(
    Layer.succeed(Configuration, Configuration.of(DEFAULT_CONFIGURATION)),
  ),
);

describe('Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.layer(TestLayer)((it) => {
    it.effect('should generate multiple metadata from single file', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name: string; };
          /** @${configuration.jsdocTag} */
          export type Bar = { name: string; };
          /** @${configuration.jsdocTag} */
          export type Baz = { name: string; };`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');

        expect(results).toHaveLength(3);
      }),
    );

    it.effect('should return correct typename', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name: string; }`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');

        expect(results[0]?.name).toBe('Foo');
      }),
    );

    it.effect('should return correct filepath', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name: string; }`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');

        expect(results[0]?.path).toBe('test.ts');
      }),
    );

    it.effect('should correctly generate TYPE_LITERAL metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name: string; }`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const shape = results[0]?.shape;

        expect(shape?.kind).toBe('TYPE_LITERAL');
        expect(shape?.optional).toBe(false);
        expect(shape?.kind === 'TYPE_LITERAL' && shape.metadata).toEqual(
          expect.objectContaining({ name: expect.any(Object) }),
        );
      }),
    );

    it.effect.each([
      { kind: 'STRING', typeValue: 'string' },
      { kind: 'NUMBER', typeValue: 'number' },
      { kind: 'BOOLEAN', typeValue: 'boolean' },
      { kind: 'UNDEFINED', typeValue: 'undefined' },
      { kind: 'NULL', typeValue: 'null' },
      { kind: 'DATE', typeValue: 'Date' },
    ])('should correctly generate $kind metadata', ({ kind, typeValue }) =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name: ${typeValue}; }`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: {
            kind,
            optional: false,
            inlineDefault: Option.none<string>(),
          },
        });
      }),
    );

    it.effect.each([
      { kind: 'STRING', typeValue: 'string', inlineDefault: "'test'" },
      { kind: 'NUMBER', typeValue: 'number', inlineDefault: '1' },
      { kind: 'BOOLEAN', typeValue: 'boolean', inlineDefault: 'true' },
      {
        kind: 'DATE',
        typeValue: 'Date',
        inlineDefault: 'new Date("2025-11-07T11:12:22.970Z")',
      },
    ])(
      'should correctly generate $kind metadata with inline default',
      ({ kind, typeValue, inlineDefault }) =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = {
            /** @${configuration.inlineDefaultJsdocTag} ${inlineDefault} */
            name: ${typeValue};
          }`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: {
              kind,
              optional: false,
              inlineDefault: Option.some<string>(inlineDefault),
            },
          });
        }),
    );

    it.effect.each([
      { kind: 'STRING', typeValue: 'string' },
      { kind: 'NUMBER', typeValue: 'number' },
      { kind: 'BOOLEAN', typeValue: 'boolean' },
      { kind: 'UNDEFINED', typeValue: 'undefined' },
      { kind: 'NULL', typeValue: 'null' },
      { kind: 'DATE', typeValue: 'Date' },
    ])(
      'should correctly generate optional $kind metadata',
      ({ kind, typeValue }) =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: ${typeValue}; }`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: expect.objectContaining({
              kind,
              inlineDefault: Option.none<string>(),
              optional: true,
            }),
          });
        }),
    );

    it.effect.each([
      'Array<string>',
      'Array<number>',
      'Array<boolean>',
      'Array<Date>',
      'Array<undefined>',
      'Array<null>',
      'Array<Array<string>>',
      'Array<{ foo: string; }>',
      'string[]',
      'number[]',
      'boolean[]',
      'Date[]',
      'undefined[]',
      'null[]',
      'string[][]',
      '({ foo: string })[]',
    ])(
      'should correctly generate ARRAY metadata when type is %s',
      (typeValue) =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name: ${typeValue}; }`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: {
              kind: 'ARRAY',
              inlineDefault: Option.none<string>(),
              optional: false,
            },
          });
        }),
    );

    it.effect('should correctly generate optional ARRAY metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: string[]; }`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: {
            kind: 'ARRAY',
            inlineDefault: Option.none<string>(),
            optional: true,
          },
        });
      }),
    );

    it.effect('should correctly generate UNION metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name: string | number | boolean | Date | undefined | null | Array<string>; }`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: {
            kind: 'UNION',
            inlineDefault: Option.none<string>(),
            members: [
              {
                kind: 'STRING',
                optional: false,
                inlineDefault: Option.none<string>(),
              },
              {
                kind: 'NUMBER',
                optional: false,
                inlineDefault: Option.none<string>(),
              },
              {
                kind: 'BOOLEAN',
                optional: false,
                inlineDefault: Option.none<string>(),
              },
              {
                kind: 'DATE',
                optional: false,
                inlineDefault: Option.none<string>(),
              },
              {
                kind: 'UNDEFINED',
                optional: false,
                inlineDefault: Option.none<string>(),
              },
              {
                kind: 'NULL',
                optional: false,
                inlineDefault: Option.none<string>(),
              },
              {
                kind: 'ARRAY',
                optional: false,
                inlineDefault: Option.none<string>(),
              },
            ],
            optional: false,
          },
        });
      }),
    );

    it.effect('should correctly generate optional UNION metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: string | number; }`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: expect.objectContaining({
            kind: 'UNION',
            inlineDefault: Option.none<string>(),

            optional: true,
          }),
        });
      }),
    );

    it.effect.each(['"test"', 0, false, true])(
      'should correctly generate LITERAL metadata when type is %s',
      (literalValue) =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name: ${literalValue}; }`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: {
              kind: 'LITERAL',
              inlineDefault: Option.none<string>(),
              literalValue: `${literalValue}`,
              optional: false,
            },
          });
        }),
    );

    it.effect('should correctly generate optional LITERAL metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: false; }`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: expect.objectContaining({
            kind: 'LITERAL',
            inlineDefault: Option.none<string>(),
            optional: true,
          }),
        });
      }),
    );

    it.effect('should correctly generate TYPE_LITERAL metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name: { firstName: string; lastName: string; }; }`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: {
            kind: 'TYPE_LITERAL',
            inlineDefault: Option.none<string>(),
            metadata: {
              firstName: {
                kind: 'STRING',
                inlineDefault: Option.none<string>(),
                optional: false,
              },
              lastName: {
                kind: 'STRING',
                inlineDefault: Option.none<string>(),
                optional: false,
              },
            },
            optional: false,
          },
        });
      }),
    );

    it.effect('should correctly generate nested TYPE_LITERAL metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { profile: { name: { firstName: string; lastName: string; } }; }`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          profile: {
            kind: 'TYPE_LITERAL',
            inlineDefault: Option.none<string>(),
            optional: false,
            metadata: {
              name: {
                kind: 'TYPE_LITERAL',
                inlineDefault: Option.none<string>(),
                optional: false,
                metadata: {
                  firstName: {
                    kind: 'STRING',
                    inlineDefault: Option.none<string>(),
                    optional: false,
                  },
                  lastName: {
                    kind: 'STRING',
                    inlineDefault: Option.none<string>(),
                    optional: false,
                  },
                },
              },
            },
          },
        });
      }),
    );

    it.effect('should correctly generate TYPE_LITERAL metadata from Pick', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          type Bar = { foo: string; bar: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { name: Pick<Bar, 'foo'>; };`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: {
            kind: 'TYPE_LITERAL',
            inlineDefault: Option.none<string>(),
            metadata: {
              foo: {
                kind: 'STRING',
                inlineDefault: Option.none<string>(),
                optional: false,
              },
            },
            optional: false,
          },
        });
      }),
    );

    it.effect(
      'should correctly generate optional TYPE_LITERAL metadata from Pick',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          type Bar = { foo: string; bar: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: Pick<Bar, 'foo'>; };`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: expect.objectContaining({
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              optional: true,
            }),
          });
        }),
    );

    it.effect('should correctly generate TYPE_LITERAL metadata from Omit', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          type Bar = { foo: string; bar: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { name: Omit<Bar, 'bar'>; };`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: {
            kind: 'TYPE_LITERAL',
            inlineDefault: Option.none<string>(),
            metadata: {
              foo: {
                kind: 'STRING',
                inlineDefault: Option.none<string>(),
                optional: false,
              },
            },
            optional: false,
          },
        });
      }),
    );

    it.effect(
      'should correctly generate optional TYPE_LITERAL metadata from Omit',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          type Bar = { foo: string; bar: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: Omit<Bar, 'bar'>; };`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: expect.objectContaining({
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              optional: true,
            }),
          });
        }),
    );

    it.effect(
      'should correctly generate TYPE_LITERAL metadata from Partial',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          type Bar = { foo: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { name: Partial<Bar>; };`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: {
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              metadata: {
                foo: {
                  kind: 'STRING',
                  inlineDefault: Option.none<string>(),
                  optional: true,
                },
              },
              optional: false,
            },
          });
        }),
    );

    it.effect(
      'should correctly generate optional TYPE_LITERAL metadata from Partial',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          type Bar = { foo: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: Partial<Bar>; };`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: expect.objectContaining({
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              optional: true,
            }),
          });
        }),
    );

    it.effect(
      'should correctly generate TYPE_LITERAL metadata from Required',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          type Bar = { foo?: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { name: Required<Bar>; };`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: {
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              metadata: {
                foo: {
                  kind: 'STRING',
                  inlineDefault: Option.none<string>(),
                  optional: false,
                },
              },
              optional: false,
            },
          });
        }),
    );

    it.effect(
      'should correctly generate optional TYPE_LITERAL metadata from Required',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          type Bar = { foo: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: Required<Bar>; };`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: expect.objectContaining({
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              optional: true,
            }),
          });
        }),
    );

    it.effect(
      'should correctly generate TYPE_LITERAL metadata from Readonly',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          type Bar = { foo: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { name: Readonly<Bar>; };`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: {
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              metadata: {
                foo: {
                  kind: 'STRING',
                  inlineDefault: Option.none<string>(),
                  optional: false,
                },
              },
              optional: false,
            },
          });
        }),
    );

    it.effect(
      'should correctly generate optional TYPE_LITERAL metadata from Readonly',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          type Bar = { foo: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: Readonly<Bar>; };`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: expect.objectContaining({
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              optional: true,
            }),
          });
        }),
    );

    it.effect(
      'should correctly generate TYPE_LITERAL metadata from Extract',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          type Bar = { type: 'bar'; bar: string; } | { type: 'foo'; foo: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { name: Extract<Bar, { type: 'bar' }>; };`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: {
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              metadata: {
                type: {
                  kind: 'LITERAL',
                  inlineDefault: Option.none<string>(),
                  literalValue: '"bar"',
                  optional: false,
                },
                bar: {
                  kind: 'STRING',
                  optional: false,

                  inlineDefault: Option.none<string>(),
                },
              },
              optional: false,
            },
          });
        }),
    );

    it.effect(
      'should correctly generate optional TYPE_LITERAL metadata from Extract',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          type Bar = { type: 'bar'; bar: string; } | { type: 'foo'; foo: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: Extract<Bar, { type: 'bar' }>; };`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: expect.objectContaining({
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              optional: true,
            }),
          });
        }),
    );

    it.effect(
      'should correctly generate TYPE_LITERAL metadata from NonNullable',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          type Bar = { name: string } | null | undefined;
          /** @${configuration.jsdocTag} */
          export type Foo = { name: NonNullable<Bar> };`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: {
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              metadata: {
                name: {
                  kind: 'STRING',
                  inlineDefault: Option.none<string>(),
                  optional: false,
                },
              },
              optional: false,
            },
          });
        }),
    );

    it.effect(
      'should correctly generate optional TYPE_LITERAL metadata from Extract',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          type Bar = { name: string } | null | undefined;
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: NonNullable<Bar> };`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: expect.objectContaining({
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              optional: true,
            }),
          });
        }),
    );

    it.effect(
      'should correctly generate nested optional TYPE_LITERAL metadata',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { profile?: { name?: { firstName: string; lastName?: string; } }; }`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            profile: {
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              optional: true,
              metadata: {
                name: {
                  kind: 'TYPE_LITERAL',
                  inlineDefault: Option.none<string>(),
                  optional: true,
                  metadata: {
                    firstName: {
                      kind: 'STRING',
                      inlineDefault: Option.none<string>(),
                      optional: false,
                    },
                    lastName: {
                      kind: 'STRING',
                      inlineDefault: Option.none<string>(),
                      optional: true,
                    },
                  },
                },
              },
            },
          });
        }),
    );

    it.effect('should correctly generate TUPLE metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name: [string, number] };`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: {
            kind: 'TUPLE',
            inlineDefault: Option.none<string>(),
            members: [
              {
                kind: 'STRING',
                optional: false,

                inlineDefault: Option.none<string>(),
              },
              {
                kind: 'NUMBER',
                optional: false,

                inlineDefault: Option.none<string>(),
              },
            ],
            optional: false,
          },
        });
      }),
    );

    it.effect('should correctly generate optional TUPLE metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: [string, number] };`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: expect.objectContaining({
            kind: 'TUPLE',
            inlineDefault: Option.none<string>(),
            optional: true,
          }),
        });
      }),
    );

    it.effect('should correctly generate RECORD metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name: Record<string, number>; };`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: {
            kind: 'RECORD',
            inlineDefault: Option.none<string>(),
            keyType: {
              kind: 'STRING',
              optional: false,
              inlineDefault: Option.none<string>(),
            },
            valueType: {
              kind: 'NUMBER',
              optional: false,
              inlineDefault: Option.none<string>(),
            },
            optional: false,
          },
        });
      }),
    );

    it.effect('should correctly generate optional RECORD metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: Record<string, number>; };`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: expect.objectContaining({
            kind: 'RECORD',
            inlineDefault: Option.none<string>(),
            optional: true,
          }),
        });
      }),
    );

    it.effect('should correctly generate BUILDER metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Bar = { name: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { bar: Bar; };`),
        );
        const parser = yield* Parser;

        const results = (yield* parser.generateBuildersMetadata(
          'test.ts',
        )).filter((v) => v.name === 'Foo');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          bar: {
            kind: 'BUILDER',
            inlineDefault: Option.none<string>(),
            name: 'Bar',
            optional: false,
          },
        });
      }),
    );

    it.effect('should correctly generate optional BUILDER metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Bar = { name: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { bar?: Bar; };`),
        );
        const parser = yield* Parser;

        const results = (yield* parser.generateBuildersMetadata(
          'test.ts',
        )).filter((v) => v.name === 'Foo');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          bar: expect.objectContaining({
            kind: 'BUILDER',
            inlineDefault: Option.none<string>(),
            optional: true,
          }),
        });
      }),
    );

    it.effect(
      'should correctly generate TYPE_LITERAL metadata instead of BUILDER when nested builders are turned off',
      () =>
        Effect.gen(function* () {
          const configuration = Configuration.of({
            ...(yield* Configuration),
            withNestedBuilders: false,
          });
          const typeNodeParserLayer = TypeNodeParser.Default.pipe(
            Layer.provide(Layer.succeed(Configuration, configuration)),
          );
          const parserLayer = Parser.DefaultWithoutDependencies.pipe(
            Layer.provide(
              FileSystem.layerNoop({
                readFileString: fsReadFileStringMock,
              }),
            ),
            Layer.provide(typeNodeParserLayer),
          );
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Bar = { name: string; };
          /** @${configuration.jsdocTag} */
          export type Foo = { bar: Bar; };`),
          );
          const parser = yield* Parser.pipe(Effect.provide(parserLayer));

          const results = (yield* parser.generateBuildersMetadata(
            'test.ts',
          )).filter((v) => v.name === 'Foo');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            bar: {
              kind: 'TYPE_LITERAL',
              inlineDefault: Option.none<string>(),
              optional: false,
              metadata: {
                name: {
                  kind: 'STRING',
                  inlineDefault: Option.none<string>(),
                  optional: false,
                },
              },
            },
          });
        }),
    );

    it.effect('should correctly generate TYPE_CAST metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name: string & { __brand: 'name' }; };`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: {
            kind: 'TYPE_CAST',
            inlineDefault: Option.none<string>(),
            baseTypeMetadata: {
              kind: 'STRING',
              inlineDefault: Option.none<string>(),
              optional: false,
            },
            optional: false,
          },
        });
      }),
    );

    it.effect('should correctly generate optional TYPE_CAST metadata', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name?: string & { __brand: 'name' }; };`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: expect.objectContaining({
            kind: 'TYPE_CAST',
            inlineDefault: Option.none<string>(),
            optional: true,
          }),
        });
      }),
    );

    it.effect('should correctly generate metadata from type reference', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Bar = Foo;

          type Foo { name: string};`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');
        const [shapeMetadata] = getBuildersShapeMetadata(results);

        expect(shapeMetadata).toEqual({
          name: {
            kind: 'STRING',
            inlineDefault: Option.none<string>(),
            optional: false,
          },
        });
      }),
    );

    it.effect(
      'should correctly generate metadata from interface reference',
      () =>
        Effect.gen(function* () {
          const configuration = yield* Configuration;
          fsReadFileStringMock.mockReturnValueOnce(
            Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Bar = Foo;

          interface Foo { name: string};`),
          );
          const parser = yield* Parser;

          const results = yield* parser.generateBuildersMetadata('test.ts');
          const [shapeMetadata] = getBuildersShapeMetadata(results);

          expect(shapeMetadata).toEqual({
            name: {
              kind: 'STRING',
              inlineDefault: Option.none<string>(),
              optional: false,
            },
          });
        }),
    );

    it.effect('should ignore annotated interfaces', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export interface Foo { name: string; }`),
        );
        const parser = yield* Parser;

        const results = yield* parser.generateBuildersMetadata('test.ts');

        expect(results).toHaveLength(0);
      }),
    );

    it.effect('should die when there is some unexported annotated type', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          type Foo = { name: string; }`),
        );
        const parser = yield* Parser;

        const exit = yield* parser
          .generateBuildersMetadata('test.ts')
          .pipe(Effect.exit);

        expect(Exit.isFailure(exit) && Cause.isDie(exit.cause)).toBe(true);
      }),
    );

    it.effect('should die when builder is not an object', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = string`),
        );
        const parser = yield* Parser;

        const exit = yield* parser
          .generateBuildersMetadata('test.ts')
          .pipe(Effect.exit);

        expect(Exit.isFailure(exit) && Cause.isDie(exit.cause)).toBe(true);
      }),
    );

    it.effect('should die when builder has wrong record type', () =>
      Effect.gen(function* () {
        const configuration = yield* Configuration;
        fsReadFileStringMock.mockReturnValueOnce(
          Effect.succeed(`
          /** @${configuration.jsdocTag} */
          export type Foo = { name: Record<> }`),
        );
        const parser = yield* Parser;

        const exit = yield* parser
          .generateBuildersMetadata('test.ts')
          .pipe(Effect.exit);

        expect(Exit.isFailure(exit) && Cause.isDie(exit.cause)).toBe(true);
      }),
    );
  });
});

const getBuildersShapeMetadata = (buildersMetadata: DataBuilderMetadata[]) =>
  buildersMetadata
    .map((builderMetadata) =>
      builderMetadata.shape.kind === 'TYPE_LITERAL'
        ? builderMetadata.shape.metadata
        : undefined,
    )
    .filter(Boolean);
