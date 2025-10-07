import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import { Project } from 'ts-morph';

export const createSourceFile = (path: string, sourceCode: string) =>
  Effect.try({
    try: () => {
      const project = new Project();
      return project.createSourceFile(path, sourceCode, {
        overwrite: true,
      });
    },
    catch: (e) => new CreateSourceFileError({ cause: e }),
  });

class CreateSourceFileError extends Data.TaggedError('CreateSourceFileError')<{
  cause: unknown;
}> {}
