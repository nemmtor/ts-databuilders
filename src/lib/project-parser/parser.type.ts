import type * as Option from 'effect/Option';

export type ParsedFile = {
  fileAbsolutePath: string;
  declarations: Declaration[];
};

export type Declaration = {
  name: string;
  propertySignatures: PropertySignature[];
  jsDocTags: JsDocTag[];
};

export type PropertySignature = {
  name: string;
  typeNode: TypeNode;
  hasQuestionToken: boolean;
  jsDocTags: JsDocTag[];
};

export type TypeNode =
  | StringKeyword
  | NumberKeyword
  | BooleanKeyword
  | UndefinedKeyword
  | LiteralType
  | BigIntKeyword
  | SymbolKeyword
  | AnyKeyword
  | UnknownKeyword
  | NeverKeyword
  | TypeLiteral
  | ArrayType
  | TupleType
  | UnionType
  | IntersectionType
  | TypeReference;

type StringKeyword = {
  kind: 'StringKeyword';
};

type NumberKeyword = {
  kind: 'NumberKeyword';
};

type BooleanKeyword = {
  kind: 'BooleanKeyword';
};

type UndefinedKeyword = {
  kind: 'UndefinedKeyword';
};

type BigIntKeyword = {
  kind: 'BigIntKeyword';
};

type SymbolKeyword = {
  kind: 'SymbolKeyword';
};

type AnyKeyword = {
  kind: 'AnyKeyword';
};

type UnknownKeyword = {
  kind: 'UnknownKeyword';
};

type NeverKeyword = {
  kind: 'NeverKeyword';
};

type LiteralType = {
  kind: 'LiteralType';
  literal: string;
};

export type TypeLiteral = {
  kind: 'TypeLiteral';
  propertySignatures: PropertySignature[];
};

type ArrayType = {
  kind: 'ArrayType';
};

type TupleType = {
  kind: 'TupleType';
  elements: TypeNode[];
};

type UnionType = {
  kind: 'UnionType';
  members: TypeNode[];
};

type IntersectionType = {
  kind: 'IntersectionType';
  members: TypeNode[];
};

export type TypeReference = {
  kind: 'TypeReference';
  referenceName: string;
  inlineType: Option.Option<TypeNode>;
  jsDocTags: JsDocTag[];
};

export type JsDocTag = {
  name: string;
  comment: string | undefined;
};
