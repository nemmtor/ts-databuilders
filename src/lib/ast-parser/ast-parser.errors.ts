import * as Data from 'effect/Data';

export class CreateTSSourceFileError extends Data.TaggedError(
  'CreateTSSourceFileError',
)<{
  cause: unknown;
}> {}
