import { vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import * as ts from '../../typescript/typescript';
import {
  type ArrayType,
  ArrayTypeVisitor,
  type BuiltinOpaqueType,
  BuiltinOpaqueTypeVisitor,
  type LiteralType,
  LiteralTypeVisitor,
  type PrimitiveKeyword,
  PrimitiveKeywordVisitor,
  type PropertySignature,
  PropertySignatureVisitor,
  type SourceFile,
  SourceFileVisitor,
  type SyntaxList,
  SyntaxListVisitor,
  type TypeAliasDeclaration,
  TypeAliasDeclarationVisitor,
  type TypeLiteral,
  TypeLiteralVisitor,
  type TypeNode,
  TypeNodeVisitor,
  type UnionType,
  UnionTypeVisitor,
} from './visitor';
import type { VisitorLayer } from './visitor.layer';

type Opts = {
  visitSyntaxList?: SyntaxListVisitor['Type']['visit'];
  visitTypeAliasDeclaration?: TypeAliasDeclarationVisitor['Type']['visit'];
  visitTypeLiteral?: TypeLiteralVisitor['Type']['visit'];
  visitSourceFile?: SourceFileVisitor['Type']['visit'];
  visitPropertySignature?: PropertySignatureVisitor['Type']['visit'];
  visitPrimitiveKeyword?: PrimitiveKeywordVisitor['Type']['visit'];
  visitLiteralType?: LiteralTypeVisitor['Type']['visit'];
  visitBuiltinOpaqueType?: BuiltinOpaqueTypeVisitor['Type']['visit'];
  visitArrayType?: ArrayTypeVisitor['Type']['visit'];
  visitUnionType?: UnionTypeVisitor['Type']['visit'];
  visitTypeNode?: TypeNodeVisitor['Type']['visit'];
};

export const visitSourceFile = Effect.succeed<SourceFile>({
  fileName: '',
  syntaxList: [],
});
export const visitSyntaxList = Effect.succeed<SyntaxList>([]);
export const visitTypeAliasDeclaration = Effect.succeed(
  Option.some<TypeAliasDeclaration>({
    kind: ts.SyntaxKind.TypeAliasDeclaration,
    name: '',
    type: { kind: ts.SyntaxKind.TypeLiteral, members: [] },
    jsDocTagsNames: [],
  }),
);
export const visitTypeLiteral = Effect.succeed<TypeLiteral>({
  kind: ts.SyntaxKind.TypeLiteral,
  members: [],
});
export const visitPropertySignature = Effect.succeed(
  Option.some<PropertySignature>({
    kind: ts.SyntaxKind.PropertySignature,
    identifier: '',
    hasQuestionToken: false,
    type: { kind: ts.SyntaxKind.StringKeyword },
    jsDocTagsNames: [],
  }),
);
export const visitPrimitiveKeyword = Effect.succeed<PrimitiveKeyword>({
  kind: ts.SyntaxKind.StringKeyword,
});
export const visitLiteralType = Effect.succeed<LiteralType>({
  kind: ts.SyntaxKind.LiteralType,
  literal: '""',
});
export const visitBuiltinOpaqueType = Effect.succeed<BuiltinOpaqueType>({
  kind: ts.SyntaxKind.TypeReference,
  typeName: ts.BUILTIN_OPAQUE_TYPES[0],
});
export const visitArrayType = Effect.succeed<ArrayType>({
  kind: ts.SyntaxKind.ArrayType,
});
export const visitUnionType = Effect.succeed<UnionType>({
  kind: ts.SyntaxKind.UnionType,
  types: [],
});
export const visitTypeNode = Effect.succeed(
  Option.some<TypeNode>({
    kind: ts.SyntaxKind.StringKeyword,
  }),
);

export const createTestVisitorLayer = (opts?: Opts): typeof VisitorLayer =>
  Layer.mergeAll(
    Layer.succeed(
      SourceFileVisitor,
      SourceFileVisitor.of({
        visit: opts?.visitSourceFile ?? vi.fn(() => visitSourceFile),
      }),
    ),
    Layer.succeed(
      SyntaxListVisitor,
      SyntaxListVisitor.of({
        visit: opts?.visitSyntaxList ?? vi.fn(() => visitSyntaxList),
      }),
    ),
    Layer.succeed(
      TypeAliasDeclarationVisitor,
      TypeAliasDeclarationVisitor.of({
        visit:
          opts?.visitTypeAliasDeclaration ??
          vi.fn(() => visitTypeAliasDeclaration),
      }),
    ),
    Layer.succeed(
      TypeLiteralVisitor,
      TypeLiteralVisitor.of({
        visit: opts?.visitTypeLiteral ?? vi.fn(() => visitTypeLiteral),
      }),
    ),
    Layer.succeed(
      PropertySignatureVisitor,
      PropertySignatureVisitor.of({
        visit:
          opts?.visitPropertySignature ?? vi.fn(() => visitPropertySignature),
      }),
    ),
    Layer.succeed(
      PrimitiveKeywordVisitor,
      PrimitiveKeywordVisitor.of({
        visit:
          opts?.visitPrimitiveKeyword ?? vi.fn(() => visitPrimitiveKeyword),
      }),
    ),
    Layer.succeed(
      LiteralTypeVisitor,
      LiteralTypeVisitor.of({
        visit: opts?.visitLiteralType ?? vi.fn(() => visitLiteralType),
      }),
    ),
    Layer.succeed(
      BuiltinOpaqueTypeVisitor,
      BuiltinOpaqueTypeVisitor.of({
        visit:
          opts?.visitBuiltinOpaqueType ?? vi.fn(() => visitBuiltinOpaqueType),
      }),
    ),
    Layer.succeed(
      ArrayTypeVisitor,
      ArrayTypeVisitor.of({
        visit: opts?.visitArrayType ?? vi.fn(() => visitArrayType),
      }),
    ),
    Layer.succeed(
      UnionTypeVisitor,
      UnionTypeVisitor.of({
        visit: opts?.visitUnionType ?? vi.fn(() => visitUnionType),
      }),
    ),
    Layer.succeed(
      TypeNodeVisitor,
      TypeNodeVisitor.of({
        visit: opts?.visitTypeNode ?? vi.fn(() => visitTypeNode),
      }),
    ),
  );
