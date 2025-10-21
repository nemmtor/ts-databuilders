export const createBuilderMethod = (props: {
  typeName: string;
  fieldName: string;
  optional: boolean;
}) => {
  const { fieldName, optional, typeName } = props;
  const normalizedFieldName = fieldName.replaceAll("'", '').replaceAll('"', '');
  const parameterName = normalizedFieldName
    .replaceAll('-', '')
    .replaceAll('_', '');

  const methodName = `with${parameterName.charAt(0).toUpperCase()}${parameterName.slice(1)}`;

  const statements = optional
    ? [
        `if (!${parameterName}) {`,
        `  const { "${normalizedFieldName}": _unused, ...rest } = this.build();`,
        `  return this.with(rest);`,
        `}`,
        `return this.with({ ${fieldName}: ${parameterName} });`,
      ]
    : [`return this.with({ ${fieldName}: ${parameterName} });`];

  return {
    name: methodName,
    isPublic: true,
    parameters: [
      {
        name: parameterName,
        type: `${typeName}['${normalizedFieldName}']`,
      },
    ],
    statements: statements,
  };
};
