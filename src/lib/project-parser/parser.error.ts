import * as Data from 'effect/Data';

export class GetNodeChildrenError extends Data.TaggedError(
  'GetNodeChildrenError',
)<{
  cause: unknown;
}> {}

export class SyntaxListNodeNotFoundError extends Data.TaggedError(
  'SyntaxListNodeNotFoundError',
) {}

export class UnsupportedTypeAliasDeclarationTypeNodeError extends Data.TaggedError(
  'UnsupportedTypeAliasDeclarationTypeNodeError',
) {}

export class GetJsDocTagsNamesError extends Data.TaggedError(
  'GetJsDocTagsNamesError',
)<{ cause: unknown }> {}

export class UnsupportedTypeLiteralNodeMemberError extends Data.TaggedError(
  'UnsupportedTypeLiteralNodeMemberError',
) {}

export class MissingPropertySignatureTypeNodeError extends Data.TaggedError(
  'MissingPropertySignatureTypeNodeError',
) {}

export class GetTypeNodeNameTextError extends Data.TaggedError(
  'GetTypeNodeNameTextError',
)<{ cause: unknown }> {}

export class CannotGetNodeTextError extends Data.TaggedError(
  'CannotGetNodeTextError',
)<{ cause: unknown }> {}

export class UnsupportedTypeNodeError extends Data.TaggedError(
  'UnsupportedTypeNodeError',
)<{ kind: string }> {}

export class CannotCreateSyntheticTypeNodeError extends Data.TaggedError(
  'CannotCreateSyntheticTypeNodeError',
) {}

export type TypeLiteralParserError =
  | UnsupportedTypeLiteralNodeMemberError
  | MissingPropertySignatureTypeNodeError
  | GetTypeNodeNameTextError
  | CannotGetNodeTextError
  | UnsupportedTypeNodeError
  | GetJsDocTagsNamesError
  | CannotCreateSyntheticTypeNodeError;
