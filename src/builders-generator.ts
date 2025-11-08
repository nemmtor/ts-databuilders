import { Project } from 'ts-morph';

import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Configuration from './configuration';
import * as CaseSchemas from './lib/case-schemas';
import * as IdGenerator from './lib/id-generator';
import * as Process from './lib/process';
import type * as Parser from './parser';
import type * as TypeNodeParser from './parser';

class BuilderGenerator extends Effect.Service<BuilderGenerator>()(
  '@TSDataBuilders/BuilderGenerator',
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const process = yield* Process.Process;
      const configuration = yield* Configuration.Configuration;
      const idGenerator = yield* IdGenerator.IdGenerator;

      const { fileSuffix, builderSuffix, defaults, fileCase } = configuration;

      const typeNameToFileName = Effect.fnUntraced(function* (
        typeName: string,
      ) {
        const decoderByCase = {
          kebab: CaseSchemas.KebabCaseFromString.pipe(Schema.decode),
          pascal: CaseSchemas.PascalCaseFromString.pipe(Schema.decode),
          camel: CaseSchemas.CamelCaseFromString.pipe(Schema.decode),
        };
        return yield* decoderByCase[fileCase](typeName);
      });

      const getDefaultValueLiteral = (
        typeNodeMetadata: TypeNodeParser.TypeNodeMetadata,
      ): string | number | boolean =>
        Option.getOrUndefined(typeNodeMetadata.inlineDefault) ??
        Match.value(typeNodeMetadata).pipe(
          Match.when({ kind: 'STRING' }, () => `"${defaults.string}"`),
          Match.when({ kind: 'NUMBER' }, () => defaults.number),
          Match.when({ kind: 'BOOLEAN' }, () => defaults.boolean),
          Match.when({ kind: 'UNDEFINED' }, () => 'undefined'),
          Match.when({ kind: 'NULL' }, () => 'null'),
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
          const outputDir = path.join(
            yield* process.cwd,
            configuration.outputDir,
          );
          const baseBuilderPath = path.resolve(
            outputDir,
            `${yield* typeNameToFileName('dataBuilder')}.ts`,
          );
          yield* Effect.logDebug(
            `[Builders]: Creating base builder at ${baseBuilderPath}`,
          );
          yield* Effect.orDie(
            fs.writeFileString(baseBuilderPath, `${BASE_BUILDER_CONTENT}\n`),
          );
        }),
        generateBuilder: Effect.fnUntraced(function* (
          builderMetadata: Parser.DataBuilderMetadata,
        ) {
          const project = new Project();
          const typeName = builderMetadata.name;
          yield* Effect.logDebug(
            `[Builders]: Creating builder for ${typeName}`,
          );

          const outputDir = path.join(
            yield* process.cwd,
            configuration.outputDir,
          );

          const builderFilePath = path.resolve(
            outputDir,
            `${yield* typeNameToFileName(typeName)}${fileSuffix}.ts`,
          );
          yield* Effect.logDebug(
            `[Builders]: Creating builder content for ${typeName}`,
          );

          const file = project.createSourceFile(
            `__temp_${yield* idGenerator.generateUuid}.ts`,
            '',
            {
              overwrite: true,
            },
          );

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
          yield* Effect.forEach(
            nestedBuildersTypeNames,
            (nestedBuilderTypeName) =>
              CaseSchemas.KebabCaseFromString.pipe(Schema.decode)(
                nestedBuilderTypeName,
              ).pipe(
                Effect.andThen((camelCasedName) =>
                  file.addImportDeclaration({
                    namedImports: [`${nestedBuilderTypeName}${builderSuffix}`],
                    moduleSpecifier: `./${camelCasedName}${fileSuffix}`,
                  }),
                ),
              ),
            { concurrency: 'unbounded' },
          );
          const defaultEntries = Object.entries(builderMetadata.shape.metadata)
            .filter(([_, { optional }]) => !optional)
            .map(
              ([key, typePropertyShape]) =>
                `${key}: ${typePropertyShape.kind === 'TYPE_CAST' ? `${getDefaultValueLiteral(typePropertyShape)} as ${typeName}['${key}']` : getDefaultValueLiteral(typePropertyShape)}`,
            );

          const builderMethods = yield* Effect.all(
            Object.entries(builderMetadata.shape.metadata).map(
              ([fieldName, { optional, kind }]) =>
                createBuilderMethod({
                  fieldName,
                  optional,
                  typeName,
                  isNestedBuilder: kind === 'BUILDER',
                }),
            ),
            { concurrency: 'unbounded' },
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

          yield* Effect.logDebug(
            `[Builders]: Saving builder content at ${builderFilePath}`,
          );
          yield* fs.writeFileString(builderFilePath, `${file.getText()}\n`);
        }),
      };
    }),
    dependencies: [IdGenerator.IdGenerator.Default],
  },
) {}

const UNION_TYPE_PRIORITY: TypeNodeParser.TypeNodeMetadata['kind'][] = [
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

// TODO: refactor it
function extractNestedBuilderTypeNames(
  rootBuilderShapeMetadata: Record<string, TypeNodeParser.TypeNodeMetadata>,
): string[] {
  const builderNames: string[] = [];

  function traverse(node: TypeNodeParser.TypeNodeMetadata) {
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

const createBuilderMethod = (props: {
  typeName: string;
  fieldName: string;
  optional: boolean;
  isNestedBuilder: boolean;
}) =>
  Effect.gen(function* () {
    const { fieldName, optional, typeName, isNestedBuilder } = props;

    const normalizedFieldName = fieldName
      .replaceAll("'", '')
      .replaceAll('"', '');
    const parameterName = yield* CaseSchemas.CamelCaseFromString.pipe(
      Schema.decode,
    )(normalizedFieldName);
    const methodName = `with${yield* CaseSchemas.PascalCaseFromString.pipe(Schema.decode)(normalizedFieldName)}`;

    const normalPathStatements = [
      `return this.with({ ${fieldName}: ${parameterName} });`,
    ];
    const builderPathStatements = [
      `return this.with({ ${fieldName}: ${parameterName}.build() });`,
    ];

    const returnStatements = isNestedBuilder
      ? builderPathStatements
      : normalPathStatements;

    const skipPathStatements = [
      `if (!${parameterName}) {`,
      `  const { "${normalizedFieldName}": _unused, ...rest } = this.build();`,
      `  return this.with(rest);`,
      `}`,
    ];
    const statements = optional
      ? [...skipPathStatements, ...returnStatements]
      : returnStatements;

    const parameterType = `${typeName}['${normalizedFieldName}']`;

    return {
      name: methodName,
      isPublic: true,
      parameters: [
        {
          name: parameterName,
          type: isNestedBuilder
            ? `DataBuilder<${parameterType}>`
            : parameterType,
        },
      ],
      statements: statements,
    };
  });

export class BuildersGenerator extends Effect.Service<BuildersGenerator>()(
  '@TSDataBuilders/BuildersGenerator',
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const builderGenerator = yield* BuilderGenerator;
      const process = yield* Process.Process;
      const path = yield* Path.Path;
      const configuration = yield* Configuration.Configuration;

      return {
        create: Effect.fnUntraced(function* (
          buildersMetadata: Parser.DataBuilderMetadata[],
        ) {
          const outputDir = path.join(
            yield* process.cwd,
            configuration.outputDir,
          );
          const exists = yield* Effect.orDie(fs.exists(outputDir));
          if (exists) {
            yield* Effect.logDebug(
              `[Builders]: Removing already existing output directory at ${outputDir}`,
            );
            yield* Effect.orDie(fs.remove(outputDir, { recursive: true }));
          }
          yield* Effect.logDebug(
            `[Builders]: Creating output directory at ${outputDir}`,
          );
          yield* Effect.orDie(fs.makeDirectory(outputDir, { recursive: true }));

          yield* builderGenerator.generateBaseBuilder();

          const builderNames = buildersMetadata.map((v) => v.name);
          const duplicatedBuilderNames = builderNames.filter(
            (name, index) => builderNames.indexOf(name) !== index,
          );
          const uniqueDuplicates = [...new Set(duplicatedBuilderNames)];

          if (duplicatedBuilderNames.length > 0) {
            return yield* Effect.dieMessage(
              `Duplicated builders: ${uniqueDuplicates.join(', ')}`,
            );
          }

          yield* Effect.all(
            buildersMetadata.map((builderMetadata) =>
              builderGenerator.generateBuilder(builderMetadata),
            ),
            { concurrency: 'unbounded' },
          );
        }),
      };
    }),
    dependencies: [BuilderGenerator.Default],
  },
) {}
