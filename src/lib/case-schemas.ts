import * as Schema from 'effect/Schema';

export const KebabCaseFromString = Schema.transform(
  Schema.String,
  Schema.String.pipe(Schema.brand('KebabCase')),
  {
    decode: (str) =>
      str
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .replace(/_/g, '-')
        .toLowerCase(),
    encode: (kebab) => kebab,
  },
);

export const PascalCaseFromString = Schema.transform(
  Schema.String,
  Schema.String.pipe(Schema.brand('PascalCase')),
  {
    decode: (str) =>
      str
        .split(/[-_\s]+/)
        .flatMap((word) => word.split(/(?=[A-Z])/))
        .filter(Boolean)
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(''),
    encode: (pascal) => pascal,
  },
);

export const CamelCaseFromString = Schema.transform(
  Schema.String,
  Schema.String.pipe(Schema.brand('CamelCase')),
  {
    decode: (str) =>
      str
        .split(/[-_\s]+/)
        .flatMap((word) => word.split(/(?=[A-Z])/))
        .filter(Boolean)
        .map((word, i) => {
          const lower = word.toLowerCase();
          return i === 0
            ? lower
            : lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(''),
    encode: (camel) => camel,
  },
);
