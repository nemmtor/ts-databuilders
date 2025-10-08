import path from 'node:path';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';
import type { ParsedType } from '../parser';
import { TypeScriptAST } from '../typescript-ast';
import { getDefaultValueLiteral } from './get-default-value';

export class BuilderGenerator extends Effect.Service<BuilderGenerator>()(
  '@TSDataBuilders/BuilderGenerator',
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const typeScriptAST = yield* TypeScriptAST;

      return {
        generateBaseBuilder: Effect.fnUntraced(function* (outputDir: string) {
          const baseBuilderPath = path.resolve(outputDir, 'data-builder.ts');
          yield* fs.writeFileString(baseBuilderPath, BASE_BUILDER_CONTENT);
        }),
        generateBuilderFor: Effect.fnUntraced(function* (
          parsedType: ParsedType,
          outputDir: string,
        ) {
          const typeName = parsedType.name;

          const builderFilePath = path.resolve(
            outputDir,
            `${typeName.toLowerCase()}.builder.ts`,
          );

          const file = yield* typeScriptAST.createSourceFile(
            builderFilePath,
            '',
          );

          const originalFilePath = path.resolve(parsedType.path);
          const originalFileImportPath = path
            .relative(path.dirname(builderFilePath), originalFilePath)
            .replace(/\.ts$/, '');

          yield* file.addImport({
            name: typeName,
            isTypeOnly: true,
            path: originalFileImportPath,
          });

          yield* file.addImport({
            name: 'DataBuilder',
            path: './data-builder',
          });

          const defaultEntries = Object.entries(parsedType.shape)
            .filter(([_, { optional }]) => !optional)
            .map(([key, typePropertyShape]) => {
              const value = getDefaultValueLiteral(typePropertyShape);
              return `${key}: ${value}`;
            });

          const defaultObjectLiteral = `{\n  ${defaultEntries.join(',\n  ')}\n}`;

          const builderMethods = Object.entries(parsedType.shape).map(
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

          yield* file.addClass({
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

          yield* file.save();
        }),
      };
    }),
    dependencies: [TypeScriptAST.Default],
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
