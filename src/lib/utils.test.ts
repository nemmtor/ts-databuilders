import { describe, expect, it } from '@effect/vitest';

import { isDefined, removeUndefinedFields } from './utils';

describe('isDefined', () => {
  it('should return true if value is defined', () => {
    expect(isDefined(1)).toBe(true);
  });

  it('should return true if value is 0', () => {
    expect(isDefined(0)).toBe(true);
  });

  it('should return true if value is null', () => {
    expect(isDefined(null)).toBe(true);
  });

  it('should return true if value is empty string', () => {
    expect(isDefined('')).toBe(true);
  });

  it('should return false if value is undefined', () => {
    expect(isDefined(undefined)).toBe(false);
  });
});

describe('removeUndefinedFields', () => {
  it('should remove undefined fields', () => {
    expect(removeUndefinedFields({ foo: undefined })).toEqual({});
  });

  it('should leave defined fields untouched', () => {
    expect(
      removeUndefinedFields({ foo: undefined, bar: 'bar', baz: 1, xyz: true }),
    ).toEqual({ bar: 'bar', baz: 1, xyz: true });
  });

  it('should leave empty strings untouched', () => {
    expect(removeUndefinedFields({ bar: '' })).toEqual({ bar: '' });
  });

  it('should leave nulls untouched', () => {
    expect(removeUndefinedFields({ bar: null })).toEqual({ bar: null });
  });

  it('should leave zero untouched', () => {
    expect(removeUndefinedFields({ bar: 0 })).toEqual({ bar: 0 });
  });

  it('should leave false untouched', () => {
    expect(removeUndefinedFields({ bar: false })).toEqual({ bar: false });
  });
});
