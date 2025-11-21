import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import type * as Option from 'effect/Option';

import type * as ts from '../../typescript/typescript';
import type * as VisitorError from './visitor.errors';

interface Visitor<T, A = void> {
  visit: (
    node: T,
  ) => Effect.Effect<
    A,
    VisitorError.VisitorError,
    | SourceFileVisitor
    | SyntaxListVisitor
    | TypeAliasDeclarationVisitor
    | TypeLiteralVisitor
    | PropertySignatureVisitor
    | PrimitiveKeywordVisitor
    | LiteralTypeVisitor
    | BuiltinOpaqueTypeVisitor
    | ArrayTypeVisitor
    | UnionTypeVisitor
    | TypeNodeVisitor
  >;
}

export class SourceFileVisitor extends Context.Tag('SourceFileVisitor')<
  SourceFileVisitor,
  Visitor<ts.SourceFile, SourceFile>
>() {}

export class SyntaxListVisitor extends Context.Tag('SyntaxListVisitor')<
  SyntaxListVisitor,
  Visitor<ts.SyntaxList, SyntaxList>
>() {}

export class TypeAliasDeclarationVisitor extends Context.Tag(
  'TypeAliasDeclarationVisitor',
)<
  TypeAliasDeclarationVisitor,
  Visitor<ts.TypeAliasDeclaration, Option.Option<TypeAliasDeclaration>>
>() {}

export class TypeLiteralVisitor extends Context.Tag('TypeLiteralVisitor')<
  TypeLiteralVisitor,
  Visitor<ts.TypeLiteralNode, TypeLiteral>
>() {}

export class PropertySignatureVisitor extends Context.Tag(
  'PropertySignatureVisitor',
)<
  PropertySignatureVisitor,
  Visitor<ts.PropertySignature, Option.Option<PropertySignature>>
>() {}

export class PrimitiveKeywordVisitor extends Context.Tag(
  'PrimitiveKeywordVisitor',
)<PrimitiveKeywordVisitor, Visitor<ts.TypeNode, PrimitiveKeyword>>() {}

export class LiteralTypeVisitor extends Context.Tag('LiteralTypeVisitor')<
  LiteralTypeVisitor,
  Visitor<ts.TypeNode, LiteralType>
>() {}

export class BuiltinOpaqueTypeVisitor extends Context.Tag(
  'BuiltinOpaqueTypeVisitor',
)<
  BuiltinOpaqueTypeVisitor,
  Visitor<ts.TypeReferenceNode, BuiltinOpaqueType>
>() {}

export class ArrayTypeVisitor extends Context.Tag('ArrayTypeVisitor')<
  ArrayTypeVisitor,
  Visitor<ts.ArrayTypeNode, ArrayType>
>() {}

export class UnionTypeVisitor extends Context.Tag('UnionTypeVisitor')<
  UnionTypeVisitor,
  Visitor<ts.UnionTypeNode, UnionType>
>() {}

export class TypeNodeVisitor extends Context.Tag('TypeNodeVisitor')<
  TypeNodeVisitor,
  Visitor<ts.TypeNode, Option.Option<TypeNode>>
>() {}

export type SourceFile = {
  fileName: string;
  syntaxList: SyntaxList;
};

export type SyntaxList = Array<PropertySignature | TypeAliasDeclaration>;

export type TypeAliasDeclaration = {
  kind: ts.SyntaxKind.TypeAliasDeclaration;
  name: string;
  type: TypeLiteral;
  jsDocTagsNames: string[];
};

export type TypeLiteral = {
  kind: ts.SyntaxKind.TypeLiteral;
  members: SyntaxList;
};

export type PropertySignature = {
  kind: ts.SyntaxKind.PropertySignature;
  identifier: string;
  hasQuestionToken: boolean;
  type: TypeNode;
  jsDocTagsNames: string[];
};

export type TypeNode =
  | PrimitiveKeyword
  | LiteralType
  | BuiltinOpaqueType
  | ArrayType
  | UnionType
  | TypeLiteral;

export type PrimitiveKeyword = {
  kind: ts.PrimitiveKeywordSyntaxKind;
};

export type LiteralType = {
  kind: ts.SyntaxKind.LiteralType;
  literal: string;
};

export type BuiltinOpaqueType = {
  kind: ts.SyntaxKind.TypeReference;
  typeName: string;
};

export type ArrayType = {
  kind: ts.SyntaxKind.ArrayType;
};

export type UnionType = {
  kind: ts.SyntaxKind.UnionType;
  types: Exclude<TypeNode, UnionType>[];
};
