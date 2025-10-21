import path from 'node:path';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import { Project } from 'ts-morph';
import { Configuration } from '../configuration';
import type { DataBuilderMetadata, TypeNodeMetadata } from '../parser';
import { BASE_BUILDER_CONTENT } from './base-builder-content';
import { createBuilderMethod } from './create-builder-method';
import { UNION_TYPE_PRIORITY } from './union-type-priority';

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

          if (builderMetadata.shape.kind !== 'TYPE_LITERAL') {
            return yield* Effect.dieMessage(
              '[BuilderGenerator]: Expected root type to be type literal',
            );
          }

          const defaultEntries = Object.entries(builderMetadata.shape.metadata)
            .filter(([_, { optional }]) => !optional)
            .map(
              ([key, typePropertyShape]) =>
                `${key}: ${getDefaultValueLiteral(typePropertyShape)}`,
            );

          const builderMethods = Object.entries(
            builderMetadata.shape.metadata,
          ).map(([fieldName, { optional }]) =>
            createBuilderMethod({ fieldName, optional, typeName }),
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
