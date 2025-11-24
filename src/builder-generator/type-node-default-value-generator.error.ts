import * as Data from 'effect/Data';

export class CannotGeneratorDefaultValueForNeverError extends Data.TaggedError(
  'CannotGeneratorDefaultValueForNeverError',
) {}

export class UnionMembersIsEmptyError extends Data.TaggedError(
  'UnionMembersIsEmptyError',
)<{ memberKinds: string[] }> {}

export class MissingBuiltinTypeDefaultError extends Data.TaggedError(
  'MissingBuiltinTypeDefaultError',
)<{ referenceName: string }> {}

export type TypeNodeDefaultValueGeneratorError =
  | CannotGeneratorDefaultValueForNeverError
  | UnionMembersIsEmptyError
  | MissingBuiltinTypeDefaultError;
