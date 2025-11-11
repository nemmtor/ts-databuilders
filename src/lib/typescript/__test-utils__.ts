import { vi } from '@effect/vitest';

import type { DeepPartial } from '../utils';
import * as ts from './typescript';

export const createSourceFile = (
  opts?: Omit<DeepPartial<ts.SourceFile>, 'kind'>,
): ts.SourceFile =>
  ({
    kind: ts.SyntaxKind.SourceFile,
    getChildren: vi.fn(),
    ...opts,
  }) as ts.SourceFile;

export const createSyntaxList = (
  opts?: Omit<DeepPartial<ts.SyntaxList>, 'kind'>,
): ts.SyntaxList =>
  ({
    kind: ts.SyntaxKind.SyntaxList,
    getChildren: vi.fn(),
    ...opts,
  }) as ts.SyntaxList;

export const createTypeAliasDeclaration = (
  opts?: Omit<DeepPartial<ts.TypeAliasDeclaration>, 'kind'>,
): ts.TypeAliasDeclaration =>
  ({
    kind: ts.SyntaxKind.TypeAliasDeclaration,
    type: ts.SyntaxKind.TypeLiteral,
    ...opts,
  }) as ts.TypeAliasDeclaration;

export const createTypeLiteralNode = (
  opts?: Omit<DeepPartial<ts.TypeLiteralNode>, 'kind'>,
): ts.TypeLiteralNode =>
  ({
    kind: ts.SyntaxKind.TypeLiteral,
    ...opts,
  }) as ts.TypeLiteralNode;

export const createPropertySignature = (
  opts?: Omit<DeepPartial<ts.PropertySignature>, 'kind'>,
): ts.PropertySignature =>
  ({
    kind: ts.SyntaxKind.PropertySignature,
    name: { getText: () => 'test' },
    ...opts,
  }) as ts.PropertySignature;

export const createUnionTypeNode = (
  opts?: Omit<DeepPartial<ts.UnionTypeNode>, 'kind'>,
): ts.UnionTypeNode =>
  ({
    kind: ts.SyntaxKind.UnionType,
    ...opts,
  }) as ts.UnionTypeNode;

export const createJSDocTag = (opts?: DeepPartial<ts.JSDocTag>) =>
  opts as ts.JSDocTag;

export const createTypeReferenceNode = (
  opts?: Omit<DeepPartial<ts.TypeReferenceNode>, 'kind'>,
) => ({ kind: ts.SyntaxKind.TypeReference, ...opts }) as ts.TypeReferenceNode;

export const createTypeNode = (opts?: DeepPartial<ts.TypeNode>) =>
  opts as ts.TypeNode;

export const createArrayTypeNode = (
  opts?: Omit<DeepPartial<ts.ArrayTypeNode>, 'kind'>,
) => ({ kind: ts.SyntaxKind.ArrayType, ...opts }) as ts.ArrayTypeNode;

export const createNode = (opts?: DeepPartial<ts.Node>) => opts as ts.Node;
