import { describe, expect, it } from '@effect/vitest';
import * as Schema from 'effect/Schema';

import {
  CamelCaseFromString,
  KebabCaseFromString,
  PascalCaseFromString,
} from './case-schemas';

describe('KebabCaseFromString', () => {
  it('should decode camelCase to kebab-case', () => {
    const result = KebabCaseFromString.pipe(Schema.decodeSync)('helloWorld');

    expect(result).toBe('hello-world');
  });

  it('should decode PascalCase to kebab-case', () => {
    const result = KebabCaseFromString.pipe(Schema.decodeSync)('HelloWorld');

    expect(result).toBe('hello-world');
  });

  it('should decode single word to kebab-case', () => {
    const result = KebabCaseFromString.pipe(Schema.decodeSync)('hello');

    expect(result).toBe('hello');
  });

  it('should encode to itself', () => {
    const kebabCased = KebabCaseFromString.pipe(Schema.decodeSync)(
      'helloWorld',
    );

    const result = KebabCaseFromString.pipe(Schema.encodeSync)(kebabCased);

    expect(result).toBe(kebabCased);
  });
});

describe('CamelCaseFromString', () => {
  it('should decode kebab-case to camelCase', () => {
    const result = CamelCaseFromString.pipe(Schema.decodeSync)('hello-world');

    expect(result).toBe('helloWorld');
  });

  it('should decode PascalCase to camelCase', () => {
    const result = CamelCaseFromString.pipe(Schema.decodeSync)('HelloWorld');

    expect(result).toBe('helloWorld');
  });

  it('should decode single word to camelCase', () => {
    const result = CamelCaseFromString.pipe(Schema.decodeSync)('Hello');

    expect(result).toBe('hello');
  });

  it('should encode to itself', () => {
    const camelCased = CamelCaseFromString.pipe(Schema.decodeSync)(
      'hello-world',
    );

    const result = CamelCaseFromString.pipe(Schema.encodeSync)(camelCased);

    expect(result).toBe(camelCased);
  });
});

describe('PascalCaseFromString', () => {
  it('should decode kebab-case to PascalCase', () => {
    const result = PascalCaseFromString.pipe(Schema.decodeSync)('hello-world');

    expect(result).toBe('HelloWorld');
  });

  it('should decode camelCase to PascalCase', () => {
    const result = PascalCaseFromString.pipe(Schema.decodeSync)('helloWorld');

    expect(result).toBe('HelloWorld');
  });

  it('should decode single word to PascalCase', () => {
    const result = PascalCaseFromString.pipe(Schema.decodeSync)('hello');

    expect(result).toBe('Hello');
  });

  it('should encode to itself', () => {
    const pascalCased = PascalCaseFromString.pipe(Schema.decodeSync)(
      'hello-world',
    );

    const result = PascalCaseFromString.pipe(Schema.encodeSync)(pascalCased);

    expect(result).toBe(pascalCased);
  });
});
