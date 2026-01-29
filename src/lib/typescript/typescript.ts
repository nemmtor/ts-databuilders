export {
  createPrinter,
  createProgram,
  createSourceFile,
  EmitHint,
  findConfigFile,
  getJSDocTags,
  type InterfaceDeclaration,
  isArrayTypeNode,
  isIndexedAccessTypeNode,
  isIndexSignatureDeclaration,
  isInterfaceDeclaration,
  isIntersectionTypeNode,
  isMappedTypeNode,
  isNamedTupleMember,
  isOptionalTypeNode,
  isParenthesizedTypeNode,
  isPropertySignature,
  isTemplateLiteralTypeNode,
  isTupleTypeNode,
  isTypeAliasDeclaration,
  isTypeLiteralNode,
  isTypeOperatorNode,
  isTypeQueryNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  type Node,
  NodeBuilderFlags,
  parseJsonConfigFileContent,
  readConfigFile,
  ScriptTarget,
  type SourceFile,
  SymbolFlags,
  SyntaxKind,
  type SyntaxList,
  sys,
  type Type,
  type TypeAliasDeclaration,
  type TypeElement,
  type TypeLiteralNode,
  type TypeNode,
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
  'BigInt',
  'Array',
] as const;

export type BuiltinOpaqueType = (typeof BUILTIN_OPAQUE_TYPES_ARRAY)[number];

export const isBuiltinOpaqueType = (
  name: string,
): name is BuiltinOpaqueType => {
  return BUILTIN_OPAQUE_TYPES_ARRAY.includes(name);
};
