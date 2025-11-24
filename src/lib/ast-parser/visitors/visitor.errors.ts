import * as Data from 'effect/Data';

import type * as ts from '../../typescript/typescript';

export class MissingSyntaxListNodeInSourceFileError extends Data.TaggedError(
  'MissingSyntaxListNodeInSourceFileError',
) {}

export class GetNodeChildrenError extends Data.TaggedError(
  'GetNodeChildrenError',
)<{
  cause: unknown;
}> {}

export class MissingPropertySignatureTypeNodeError extends Data.TaggedError(
  'MissingPropertySignatureTypeNodeError',
) {}

export class GetJsDocTagsNamesFailedError extends Data.TaggedError(
  'GetJsDocTagsNamesFailedError',
)<{ cause: unknown }> {}

export class ExpectedDifferentSyntaxKindError extends Data.TaggedError(
  'ExpectedDifferentSyntaxKindError',
)<{ expected: readonly ts.SyntaxKind[]; received: ts.SyntaxKind }> {}

export class ExpectedDifferentTypeError extends Data.TaggedError(
  'ExpectedDifferentTypeError',
)<{ expected: readonly string[]; received: string }> {}

export class CannotCreateSyntheticTypeNodeError extends Data.TaggedError(
  'CannotCreateSyntheticTypeNodeError',
) {}

export type VisitorError =
  | GetNodeChildrenError
  | MissingSyntaxListNodeInSourceFileError
  | MissingPropertySignatureTypeNodeError
  | GetJsDocTagsNamesFailedError
  | ExpectedDifferentSyntaxKindError
  | ExpectedDifferentTypeError
  | CannotCreateSyntheticTypeNodeError;
