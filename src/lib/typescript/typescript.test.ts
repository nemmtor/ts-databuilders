import { describe, expect, it } from '@effect/vitest';

import { createNode, createTypeReferenceNode } from './__test-utils__';
import * as ts from './typescript';

describe('typescript', () => {
  describe('isSyntaxList', () => {
    it('should return true if node is a syntax list', () => {
      expect(
        ts.isSyntaxList(createNode({ kind: ts.SyntaxKind.SyntaxList })),
      ).toBe(true);
    });

    it('should return false if node is not a syntax list', () => {
      expect(
        ts.isSyntaxList(createNode({ kind: ts.SyntaxKind.AbstractKeyword })),
      ).toBe(false);
    });
  });

  describe('isBuiltinOpaqueType', () => {
    it.each(
      ts.BUILTIN_OPAQUE_TYPES,
    )('should return true if type reference node is %s type', (typeName) => {
      expect(
        ts.isBuiltinOpaqueType(
          createTypeReferenceNode({ typeName: { getText: () => typeName } }),
        ),
      ).toBe(true);
    });

    it('should return false if type reference node is not builtin opaque type', () => {
      expect(
        ts.isBuiltinOpaqueType(
          createTypeReferenceNode({
            typeName: { getText: () => 'NotOpaqueType' },
          }),
        ),
      ).toBe(false);
    });
  });
});
