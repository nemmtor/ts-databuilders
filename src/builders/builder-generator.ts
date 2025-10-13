import path from 'node:path';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import { Project } from 'ts-morph';
import type { DataBuilderMetadata, TypeNodeMetadata } from '../parser';

export class BuilderGenerator extends Effect.Service<BuilderGenerator>()(
  '@TSDataBuilders/BuilderGenerator',
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const outputDir = yield* Config.string('outputDir');
      const fileSuffix = yield* Config.string('fileSuffix');
      const builderSuffix = yield* Config.string('builderSuffix');

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

          const defaultEntries = Object.entries(builderMetadata.shape)
            .filter(([_, { optional }]) => !optional)
            .map(([key, typePropertyShape]) => {
              const value = getDefaultValueLiteral(typePropertyShape);
              return `${key}: ${value}`;
            });

          const defaultObjectLiteral = `{\n  ${defaultEntries.join(',\n  ')}\n}`;

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

const getDefaultValueLiteral = (typeNodeMetadata: TypeNodeMetadata): string => {
  return Match.value(typeNodeMetadata).pipe(
    Match.withReturnType<string>(),
    Match.when({ kind: 'STRING' }, () => '""'),
    Match.when({ kind: 'NUMBER' }, () => '0'),
    Match.when({ kind: 'BOOLEAN' }, () => 'false'),
    Match.when({ kind: 'UNDEFINED' }, () => 'undefined'),
    Match.when({ kind: 'NULL' }, () => 'null'),
    Match.when({ kind: 'DATE' }, () => 'new Date()'),
    Match.when({ kind: 'UNION' }, (union) => {
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

      return getDefaultValueLiteral(targetTypeNode);
    }),
    Match.exhaustive,
  );
};

const UNION_TYPE_PRIORITY: TypeNodeMetadata['kind'][] = [
  'UNDEFINED',
  'NULL',
  'BOOLEAN',
  'NUMBER',
  'STRING',
  'DATE',
];
