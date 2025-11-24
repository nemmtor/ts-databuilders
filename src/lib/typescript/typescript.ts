import ts from 'typescript';

export {
  type ArrayTypeNode,
  createProgram,
  findConfigFile,
  getJSDocTags,
  isArrayTypeNode,
  isLiteralTypeNode,
  isPropertySignature,
  isTypeAliasDeclaration,
  isTypeLiteralNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  type JSDocTag,
  type LiteralTypeNode,
  type Node,
  NodeBuilderFlags,
  type PropertySignature,
  parseJsonConfigFileContent,
  readConfigFile,
  type SourceFile,
  SyntaxKind,
  type SyntaxList,
  sys,
  type TypeAliasDeclaration,
  type TypeChecker,
  type TypeElement,
  type TypeLiteralNode,
  type TypeNode,
  type TypeReferenceNode,
  type UnionTypeNode,
} from 'typescript';

export const isSyntaxList = (node: ts.Node): node is ts.SyntaxList =>
  node.kind === ts.SyntaxKind.SyntaxList;

export const PRIMITIVE_KEYWORD_SYNTAX_KINDS = [
  ts.SyntaxKind.StringKeyword,
  ts.SyntaxKind.NumberKeyword,
  ts.SyntaxKind.BooleanKeyword,
  ts.SyntaxKind.BigIntKeyword,
  ts.SyntaxKind.NeverKeyword,
  ts.SyntaxKind.UndefinedKeyword,
  ts.SyntaxKind.SymbolKeyword,
  ts.SyntaxKind.AnyKeyword,
  ts.SyntaxKind.UnknownKeyword,
] as const;

export type PrimitiveKeywordSyntaxKind =
  (typeof PRIMITIVE_KEYWORD_SYNTAX_KINDS)[number];

export const isPrimitiveKeywordSyntaxKind = (
  kind: ts.SyntaxKind,
): kind is PrimitiveKeywordSyntaxKind =>
  PRIMITIVE_KEYWORD_SYNTAX_KINDS.includes(kind);

export const BUILTIN_OPAQUE_TYPES = [
  'Date',
  'Array',
  'ReadonlyArray',
  'RegExp',
  'Error',
  'Promise',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'ArrayBuffer',
  'DataView',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
] as const;
export const isBuiltinOpaqueType = (node: ts.TypeReferenceNode) => {
  return BUILTIN_OPAQUE_TYPES.includes(node.typeName.getText());
};
