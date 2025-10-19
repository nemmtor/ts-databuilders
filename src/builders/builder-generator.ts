import path from 'node:path';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import { Project } from 'ts-morph';
import { Configuration } from '../configuration';
import type { DataBuilderMetadata, TypeNodeMetadata } from '../parser';

export class BuilderGenerator extends Effect.Service<BuilderGenerator>()(
  '@TSDataBuilders/BuilderGenerator',
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const { outputDir, fileSuffix, builderSuffix } = yield* Configuration;

      return {
        generateBaseBuilder: Effect.fnUntraced(function* () {
          const baseBuilderPath = path.resolve(outputDir, 'data-builder.ts');
          yield* fs.writeFileString(baseBuilderPath, BASE_BUILDER_CONTENT);
        }),
        generateBuilder: Effect.fnUntraced(function* (
          builderMetadata: DataBuilderMetadata,
        ) {
          const project = new Project();
          const typeName = builderMetadata.name;

          const builderFilePath = path.resolve(
            outputDir,
            `${typeName.toLowerCase()}${fileSuffix}.ts`,
          );

          const file = project.createSourceFile(builderFilePath, '', {
            overwrite: true,
          });

          const originalFilePath = path.resolve(builderMetadata.path);
          const originalFileImportPath = path
            .relative(path.dirname(builderFilePath), originalFilePath)
            .replace(/\.ts$/, '');

          file.addImportDeclaration({
            namedImports: [typeName],
            isTypeOnly: true,
            moduleSpecifier: originalFileImportPath,
          });

          file.addImportDeclaration({
            namedImports: ['DataBuilder'],
            moduleSpecifier: './data-builder',
          });

          const defaultEntries = yield* Effect.all(
            Object.entries(builderMetadata.shape)
              .filter(([_, { optional }]) => !optional)
              .map(([key, typePropertyShape]) =>
                Effect.gen(function* () {
                  const value =
                    yield* getDefaultValueLiteral(typePropertyShape);
                  return `${key}: ${value}`;
                }),
              ),
          );

          const builderMethods = Object.entries(builderMetadata.shape).map(
            ([fieldName, { optional }]) => {
              const methodName = `with${fieldName.charAt(0).toUpperCase()}${fieldName.slice(1)}`;

              const statements = optional
                ? [
                    `if (!${fieldName}) {`,
                    `  const { ${fieldName}: _${fieldName}, ...rest } = this.build();`,
                    `  return this.with(rest);`,
                    `}`,
                    `return this.with({ ${fieldName} });`,
                  ]
                : [`return this.with({ ${fieldName} });`];

              return {
                name: methodName,
                isPublic: true,
                parameters: [
                  {
                    name: fieldName,
                    type: `${typeName}['${fieldName}']`,
                  },
                ],
                statements: statements,
              };
            },
          );

          const defaultObjectLiteral = `{\n  ${defaultEntries.join(',\n  ')}\n}`;
          file.addClass({
            name: `${typeName}${builderSuffix}`,
            isExported: true,
            extends: `DataBuilder<${typeName}>`,
            methods: [
              {
                name: 'constructor',
                statements: [`super(${defaultObjectLiteral});`],
              },
              ...builderMethods,
            ],
          });

          file.saveSync();
        }),
      };
    }),
  },
) {}

const BASE_BUILDER_CONTENT = `export abstract class DataBuilder<T> {
  private data: T;

  constructor(initialData: T) {
    this.data = initialData;
  }

  public build(): Readonly<T> {
    return structuredClone(this.data);
  }

  protected with(partial: Partial<T>): this {
    this.data = { ...this.data, ...partial };
    return this;
  }
}
`;

const getDefaultValueLiteral = (
  typeNodeMetadata: TypeNodeMetadata,
): Effect.Effect<string | number | boolean, never, Configuration> =>
  Effect.gen(function* () {
    const { defaults } = yield* Configuration;

    const result = Match.value(typeNodeMetadata).pipe(
      Match.when({ kind: 'STRING' }, () =>
        Effect.succeed(`"${defaults.string}"`),
      ),
      Match.when({ kind: 'NUMBER' }, () => Effect.succeed(defaults.number)),
      Match.when({ kind: 'BOOLEAN' }, () => Effect.succeed(defaults.boolean)),
      Match.when({ kind: 'UNDEFINED' }, () => Effect.succeed('undefined')),
      Match.when({ kind: 'DATE' }, () => Effect.succeed('new Date()')),
      Match.when({ kind: 'LITERAL' }, (v) => Effect.succeed(v.literalValue)),
      Match.when({ kind: 'TYPE_LITERAL' }, (v) =>
        Effect.gen(function* () {
          const entries = yield* Effect.all(
            Object.entries(v.metadata)
              .filter(([_, { optional }]) => !optional)
              .map(([key, typePropertyShape]) =>
                Effect.gen(function* () {
                  const value =
                    yield* getDefaultValueLiteral(typePropertyShape);
                  return `${key}: ${value}`;
                }),
              ),
          );
          return `{${entries.join(', ')}}`;
        }),
      ),

      Match.when({ kind: 'UNION' }, (union) =>
        Effect.gen(function* () {
          const sortedMembers = union.members.slice().sort((a, b) => {
            const priorityA = UNION_TYPE_PRIORITY.indexOf(a.kind);
            const priorityB = UNION_TYPE_PRIORITY.indexOf(b.kind);

            const indexA = priorityA === -1 ? Infinity : priorityA;
            const indexB = priorityB === -1 ? Infinity : priorityB;

            return indexA - indexB;
          });

          const targetTypeNode = sortedMembers[0];
          if (!targetTypeNode) {
            return 'never';
          }
          return yield* getDefaultValueLiteral(targetTypeNode);
        }),
      ),
      Match.exhaustive,
    );

    return yield* result;
  });

const UNION_TYPE_PRIORITY: TypeNodeMetadata['kind'][] = [
  'UNDEFINED',
  'BOOLEAN',
  'NUMBER',
  'STRING',
  'DATE',
  'LITERAL',
  'TYPE_LITERAL',
];
