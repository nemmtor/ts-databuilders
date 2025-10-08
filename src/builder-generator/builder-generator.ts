import path from 'node:path';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';
import { Project } from 'ts-morph';
import type { ParsedType } from '../parser';
import { getDefaultValue } from './get-default-value';

export class BuilderGenerator extends Effect.Service<BuilderGenerator>()(
  'BuilderGenerator',
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      return {
        createOutputDir: Effect.fnUntraced(function* (outputDir: string) {
          yield* fs.makeDirectory(outputDir, { recursive: true });
        }),
        generateBaseBuilder: Effect.fnUntraced(function* (outputDir: string) {
          const baseBuilderPath = path.resolve(outputDir, 'data-builder.ts');
          yield* fs.writeFileString(baseBuilderPath, BASE_BUILDER_CONTENT);
        }),
        generateBuilderFor: (parsedType: ParsedType, outputDir: string) => {
          const typeName = parsedType.name;
          const project = new Project();

          const builderFilePath = path.resolve(
            outputDir,
            `${typeName.toLowerCase()}.builder.ts`,
          );

          const file = project.createSourceFile(builderFilePath, '', {
            overwrite: true,
          });

          const originalFilePath = path.resolve(parsedType.path);
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

          const defaultEntries = Object.entries(parsedType.shape).map(
            ([key, { kind }]) => {
              const value = getDefaultValue(kind);
              return `${key}: ${JSON.stringify(value)}`;
            },
          );

          const defaultObjectLiteral = `{${defaultEntries.join(',')}}`;

          const builderMethods = Object.keys(parsedType.shape).map(
            (fieldName) => {
              const methodName = `with${fieldName.charAt(0).toUpperCase()}${fieldName.slice(1)}`;

              return {
                name: methodName,
                isPublic: true,
                parameters: [
                  {
                    name: fieldName,
                    type: `${typeName}['${fieldName}']`,
                  },
                ],
                statements: [`return this.with({ ${fieldName} });`],
              };
            },
          );

          file.addClass({
            name: `${typeName}Builder`,
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
        },
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
