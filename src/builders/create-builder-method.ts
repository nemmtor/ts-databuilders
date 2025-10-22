import { toCamelCase, toPascalCase } from '../utils';

export const createBuilderMethod = (props: {
  typeName: string;
  fieldName: string;
  optional: boolean;
  isNestedBuilder: boolean;
}) => {
  const { fieldName, optional, typeName, isNestedBuilder } = props;

  const normalizedFieldName = fieldName.replaceAll("'", '').replaceAll('"', '');
  const parameterName = toCamelCase(normalizedFieldName);
  const methodName = `with${toPascalCase(normalizedFieldName)}`;

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
        type: isNestedBuilder ? `DataBuilder<${parameterType}>` : parameterType,
      },
    ],
    statements: statements,
  };
};
