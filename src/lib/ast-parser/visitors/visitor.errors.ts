import * as Data from 'effect/Data';

export class MissingSyntaxListNodeInSourceFileError extends Data.TaggedError(
  'MissingSyntaxListNodeInSourceFileError',
) {}

export class GetNodeChildrenError extends Data.TaggedError(
  'GetNodeChildrenError',
)<{
  cause: unknown;
}> {}

export class UnsupportedNodeTypeError extends Data.TaggedError(
  'UnsupportedNodeTypeError',
) {}
