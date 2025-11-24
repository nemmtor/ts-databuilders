export {
  type ArrayTypeNode,
  type ClassDeclaration,
  type ClassElement,
  createPrinter,
  createProgram,
  createSourceFile,
  EmitHint,
  factory,
  findConfigFile,
  getJSDocTags,
  type HeritageClause,
  type InterfaceDeclaration,
  isArrayTypeNode,
  isInterfaceDeclaration,
  isLiteralTypeNode,
  isNamedTupleMember,
  isPropertySignature,
  isTupleTypeNode,
  isTypeAliasDeclaration,
  isTypeLiteralNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  type JSDocTag,
  type LiteralTypeNode,
  type ModifierLike,
  NewLineKind,
  type Node,
  NodeBuilderFlags,
  type Program,
  type PropertySignature,
  parseJsonConfigFileContent,
  readConfigFile,
  ScriptTarget,
  type SourceFile,
  type Statement,
  SymbolFlags,
  SyntaxKind,
  type SyntaxList,
  sys,
  type TupleTypeNode,
  type TypeAliasDeclaration,
  type TypeChecker,
  type TypeElement,
  type TypeLiteralNode,
  type TypeNode,
  type TypeReferenceNode,
  type UnionTypeNode,
} from 'typescript';

import { type LiteralTypeNode, SyntaxKind, type TypeNode } from 'typescript';

export const isLiteralType = (
  typeNode: TypeNode,
): typeNode is LiteralTypeNode => typeNode.kind === SyntaxKind.LiteralType;

const BUILTIN_OPAQUE_TYPES_ARRAY = [
  'Date',
  'Promise',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'RegExp',
  'Error',
] as const;

export type BuiltinOpaqueType = (typeof BUILTIN_OPAQUE_TYPES_ARRAY)[number];

export const BUILTIN_OPAQUE_TYPES = new Set<BuiltinOpaqueType>(
  BUILTIN_OPAQUE_TYPES_ARRAY,
);

export const isBuiltinOpaqueType = (
  name: string,
): name is BuiltinOpaqueType => {
  return BUILTIN_OPAQUE_TYPES.has(name);
};
