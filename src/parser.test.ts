import * as FileSystem from '@effect/platform/FileSystem';
import { beforeEach, describe, expect, it, vi } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

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
            members: [
              { kind: 'STRING', optional: false },
              { kind: 'NUMBER', optional: false },
              { kind: 'BOOLEAN', optional: false },
              { kind: 'DATE', optional: false },
              { kind: 'UNDEFINED', optional: false },
              { kind: 'NULL', optional: false },
              { kind: 'ARRAY', optional: false },
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
            metadata: {
              firstName: {
                kind: 'STRING',
                optional: false,
              },
              lastName: {
                kind: 'STRING',
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
            optional: false,
            metadata: {
              name: {
                kind: 'TYPE_LITERAL',
                optional: false,
                metadata: {
                  firstName: {
                    kind: 'STRING',
                    optional: false,
                  },
                  lastName: {
                    kind: 'STRING',
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
            metadata: {
              foo: {
                kind: 'STRING',
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
            metadata: {
              foo: {
                kind: 'STRING',
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
              metadata: {
                foo: {
                  kind: 'STRING',
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
              metadata: {
                foo: {
                  kind: 'STRING',
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
              metadata: {
                foo: {
                  kind: 'STRING',
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
              metadata: {
                type: {
                  kind: 'LITERAL',
                  literalValue: '"bar"',
                  optional: false,
                },
                bar: { kind: 'STRING', optional: false },
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
              metadata: {
                name: {
                  kind: 'STRING',
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
              optional: true,
              metadata: {
                name: {
                  kind: 'TYPE_LITERAL',
                  optional: true,
                  metadata: {
                    firstName: {
                      kind: 'STRING',
                      optional: false,
                    },
                    lastName: {
                      kind: 'STRING',
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
            members: [
              { kind: 'STRING', optional: false },
              { kind: 'NUMBER', optional: false },
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
            keyType: { kind: 'STRING', optional: false },
            valueType: { kind: 'NUMBER', optional: false },
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
            optional: true,
          }),
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
            baseTypeMetadata: {
              kind: 'STRING',
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
