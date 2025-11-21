import * as Layer from 'effect/Layer';

import * as ArrayTypeVisitorLayer from './array-type-visitor.layer';
import * as BuiltinOpaqueTypeVisitorLayer from './builtin-opaque-type-visitor.layer';
import * as LiteralTypeVisitorLayer from './literal-type-visitor.layer';
import * as PrimitiveKeywordVisitorLayer from './primitive-keyword-visitor.layer';
import * as PropertySignatureVisitorLayer from './property-signature-visitor.layer';
import * as SourceFileVisitorLayer from './source-file-visitor.layer';
import * as SyntaxListVisitorLayer from './syntax-list-visitor.layer';
import * as TypeAliasDeclarationVisitorLayer from './type-alias-declaration-visitor.layer';
import * as TypeLiteralVisitorLayer from './type-literal-visitor.layer';
import * as TypeNodeVisitorLayer from './type-node-visitor.layer';
import * as UnionTypeVisitorLayer from './union-type-visitor.layer';

export const VisitorLayer = Layer.mergeAll(
  SourceFileVisitorLayer.SourceFileVisitorLayer,
  SyntaxListVisitorLayer.SyntaxListVisitorLayer,
  TypeAliasDeclarationVisitorLayer.TypeAliasDeclarationVisitorLayer,
  TypeLiteralVisitorLayer.TypeLiteralVisitorLayer,
  PropertySignatureVisitorLayer.PropertySignatureVisitorLayer,
  PrimitiveKeywordVisitorLayer.PrimitiveKeywordVisitorLayer,
  LiteralTypeVisitorLayer.LiteralTypeVisitorLayer,
  LiteralTypeVisitorLayer.LiteralTypeVisitorLayer,
  BuiltinOpaqueTypeVisitorLayer.BuiltinOpaqueTypeVisitorLayer,
  ArrayTypeVisitorLayer.ArrayTypeVisitorLayer,
  UnionTypeVisitorLayer.UnionTypeVisitorLayer,
  TypeNodeVisitorLayer.TypeNodeVisitorLayer,
);
