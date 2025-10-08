import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import { Project } from 'ts-morph';

export class TypeScriptAST extends Effect.Service<TypeScriptAST>()(
  '@TSDataBuilders/TypeScriptAST',
  {
    succeed: {
      createSourceFile: (path: string, sourceCode: string) =>
        Effect.try({
          try: () => {
            const project = new Project();
            const file = project.createSourceFile(path, sourceCode, {
              overwrite: true,
            });

            return {
              addImport: (opts: {
                name: string;
                isTypeOnly?: boolean;
                path: string;
              }) =>
                Effect.try({
                  try: () => {
                    file.addImportDeclaration({
                      namedImports: [opts.name],
                      isTypeOnly: opts.isTypeOnly,
                      moduleSpecifier: opts.path,
                    });
                  },
                  catch: (cause) => new AddImportError({ cause }),
                }),
              addClass: (opts: {
                name: string;
                extends?: string;
                isExported?: boolean;
                methods: { name: string; statements: string[] }[];
              }) =>
                Effect.try({
                  try: () => {
                    file.addClass({
                      name: opts.name,
                      isExported: opts.isExported,
                      extends: opts.extends,
                      methods: opts.methods,
                    });
                  },
                  catch: (cause) => new AddClassError({ cause }),
                }),
              save: () =>
                Effect.tryPromise({
                  try: () => file.save(),
                  catch: (cause) => new SaveError({ cause }),
                }),
            };
          },
          catch: (cause) => new CreateSourceFileError({ cause }),
        }),
    },
  },
) {}

class CreateSourceFileError extends Data.TaggedError('CreateSourceFileError')<{
  cause: unknown;
}> {}

export class AddImportError extends Data.TaggedError('AddImportError')<{
  cause: unknown;
}> {}

class AddClassError extends Data.TaggedError('AddClassError')<{
  cause: unknown;
}> {}

class SaveError extends Data.TaggedError('SaveError')<{
  cause: unknown;
}> {}
