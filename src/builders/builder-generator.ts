import path from 'node:path';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import { Project } from 'ts-morph';
import { Configuration } from '../configuration';
import type { DataBuilderMetadata, TypeNodeMetadata } from '../parser';
import { toKebabCase } from '../utils';
import { createBuilderMethod } from './create-builder-method';

export class BuilderGenerator extends Effect.Service<BuilderGenerator>()(
  '@TSDataBuilders/BuilderGenerator',
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const { outputDir, fileSuffix, builderSuffix, defaults } =
        yield* Configuration;

      const getDefaultValueLiteral = (
        typeNodeMetadata: TypeNodeMetadata,
      ): string | number | boolean =>
        Match.value(typeNodeMetadata).pipe(
          Match.when({ kind: 'STRING' }, () => `"${defaults.string}"`),
          Match.when({ kind: 'NUMBER' }, () => defaults.number),
          Match.when({ kind: 'BOOLEAN' }, () => defaults.boolean),
          Match.when({ kind: 'UNDEFINED' }, () => 'undefined'),
          Match.when({ kind: 'DATE' }, () => 'new Date()'),
          Match.when({ kind: 'ARRAY' }, () => '[]'),
          Match.when({ kind: 'LITERAL' }, (v) => v.literalValue),
          Match.when({ kind: 'TYPE_CAST' }, (v) =>
            getDefaultValueLiteral(v.baseTypeMetadata),
          ),
          Match.when({ kind: 'TUPLE' }, (v) => {
            const types = v.members.map((typePropertyShape) =>
              getDefaultValueLiteral(typePropertyShape),
            );
            return `[${types.map((type) => `${type}`).join(', ')}]`;
          }),
          Match.when({ kind: 'TYPE_LITERAL' }, (v) => {
            const entries = Object.entries(v.metadata)
              .filter(([_, { optional }]) => !optional)
              .map(
                ([key, typePropertyShape]) =>
                  `${key}: ${getDefaultValueLiteral(typePropertyShape)}`,
              );
            return `{${entries.join(', ')}}`;
          }),
          Match.when({ kind: 'RECORD' }, (v) => {
            if (v.keyType.kind === 'STRING' || v.keyType.kind === 'NUMBER') {
              return `{}`;
            }

            const key = getDefaultValueLiteral(v.keyType);
            const value = getDefaultValueLiteral(v.valueType);
            return `{${key}: ${value}}`;
          }),

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
          Match.when({ kind: 'BUILDER' }, (v) => {
            return `new ${v.name}${builderSuffix}().build()`;
          }),
          Match.exhaustive,
        );

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
            `${toKebabCase(typeName)}${fileSuffix}.ts`,
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

          if (builderMetadata.shape.kind !== 'TYPE_LITERAL') {
            return yield* Effect.dieMessage(
              '[BuilderGenerator]: Expected root type to be type literal',
            );
          }

          const nestedBuildersTypeNames = [
            ...new Set(
              extractNestedBuilderTypeNames(builderMetadata.shape.metadata),
            ),
          ];
          nestedBuildersTypeNames.forEach((nestedBuilderTypeName) => {
            file.addImportDeclaration({
              namedImports: [`${nestedBuilderTypeName}${builderSuffix}`],
              moduleSpecifier: `./${toKebabCase(nestedBuilderTypeName)}${fileSuffix}`,
            });
          });
          const defaultEntries = Object.entries(builderMetadata.shape.metadata)
            .filter(([_, { optional }]) => !optional)
            .map(
              ([key, typePropertyShape]) =>
                `${key}: ${typePropertyShape.kind === 'TYPE_CAST' ? `${getDefaultValueLiteral(typePropertyShape)} as ${typeName}['${key}']` : getDefaultValueLiteral(typePropertyShape)}`,
            );

          const builderMethods = Object.entries(
            builderMetadata.shape.metadata,
          ).map(([fieldName, { optional, kind }]) =>
            createBuilderMethod({
              fieldName,
              optional,
              typeName,
              isNestedBuilder: kind === 'BUILDER',
            }),
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

export const UNION_TYPE_PRIORITY: TypeNodeMetadata['kind'][] = [
  'UNDEFINED',
  'BOOLEAN',
  'NUMBER',
  'STRING',
  'DATE',
  'LITERAL',
  'TYPE_LITERAL',
  'ARRAY',
  'TUPLE',
  'RECORD',
];

export const BASE_BUILDER_CONTENT = `export abstract class DataBuilder<T> {
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

// TODO: refactor it
function extractNestedBuilderTypeNames(
  rootBuilderShapeMetadata: Record<string, TypeNodeMetadata>,
): string[] {
  const builderNames: string[] = [];

  function traverse(node: TypeNodeMetadata) {
    switch (node.kind) {
      case 'BUILDER':
        builderNames.push(node.name);
        break;
      case 'TYPE_LITERAL':
        Object.values(node.metadata).forEach(traverse);
        break;
      case 'UNION':
      case 'TUPLE':
        node.members.forEach(traverse);
        break;
      case 'RECORD':
        traverse(node.keyType);
        traverse(node.valueType);
        break;
    }
  }

  Object.values(rootBuilderShapeMetadata).forEach(traverse);
  return builderNames;
}
