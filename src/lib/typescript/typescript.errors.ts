import * as Data from 'effect/Data';

export class TSConfigNotFoundError extends Data.TaggedError(
  'TSConfigNotFoundError',
) {}

export class GetTSConfigError extends Data.TaggedError('GetTSConfigError')<{
  cause: unknown;
}> {}

export class CreateProjectError extends Data.TaggedError('CreateProjectError')<{
  cause: unknown;
}> {}

export class SourceFileNotFoundError extends Data.TaggedError(
  'SourceFileNotFoundError',
) {}
