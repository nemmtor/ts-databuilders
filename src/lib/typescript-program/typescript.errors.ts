import * as Data from 'effect/Data';

export class TSConfigNotFoundError extends Data.TaggedError(
  'TSConfigNotFoundError',
) {}

export class GetTSConfigError extends Data.TaggedError('GetTSConfigError')<{
  cause: unknown;
}> {}

export class CreateProgramError extends Data.TaggedError('CreateProgramError')<{
  cause: unknown;
}> {}

export class GetTypeCheckerError extends Data.TaggedError(
  'GetTypeCheckerError',
)<{
  cause: unknown;
}> {}

export class GetSourceFileError extends Data.TaggedError('GetSourceFileError')<{
  cause: unknown;
}> {}

export class CreateSourceFileError extends Data.TaggedError(
  'CreateSourceFileError',
)<{
  cause: unknown;
}> {}

export class SourceFileNotFoundError extends Data.TaggedError(
  'SourceFileNotFoundError',
) {}
