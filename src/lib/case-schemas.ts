import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';

export const NormalizedCase = Schema.transform(Schema.String, Schema.String, {
  decode: (str) => str.replace(/^['"]|['"]$/g, ''),
  encode: (normalized) => normalized,
});

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
        .map((word) => {
          if (word === word.toUpperCase()) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          }
          return word
            .split(/(?=[A-Z])/)
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join('');
        })
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

export const getDecoderByCase = Effect.fnUntraced(function* (
  nameCase: 'kebab' | 'camel' | 'pascal',
) {
  return Match.value(nameCase).pipe(
    Match.when('kebab', () => KebabCaseFromString.pipe(Schema.decode)),
    Match.when('pascal', () => PascalCaseFromString.pipe(Schema.decode)),
    Match.when('camel', () => CamelCaseFromString.pipe(Schema.decode)),
    Match.exhaustive,
  );
});
