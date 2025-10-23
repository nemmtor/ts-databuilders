import * as FileSystem from '@effect/platform/FileSystem';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import { Project, SyntaxKind } from 'ts-morph';
import { Configuration } from '../configuration';
import { type TypeNodeMetadata, TypeNodeParser } from './type-node-parser';

export class Parser extends Effect.Service<Parser>()('@TSDataBuilders/Parser', {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const typeNodeParser = yield* TypeNodeParser;
    const { jsdocTag } = yield* Configuration;

    return {
      generateBuildersMetadata: Effect.fnUntraced(
        function* (path: string) {
          const sourceCode = yield* fs.readFileString(path);
          const eitherTypeLiteralsWithDataBuilder = yield* Effect.try({
            try: () => {
              const project = new Project();
              const file = project.createSourceFile(path, sourceCode, {
                overwrite: true,
              });
              const typeAliasesWithDataBuilder = file
                .getTypeAliases()
                .filter((typeAlias) =>
                  typeAlias
                    .getJsDocs()
                    .flatMap((jsDoc) =>
                      jsDoc.getTags().flatMap((tag) => tag.getTagName()),
                    )
                    .includes(jsdocTag),
                );

              return typeAliasesWithDataBuilder
                .map((typeAlias) => {
                  const name = typeAlias.getName();
                  if (!typeAlias.isExported()) {
                    return Either.left(
                      new UnexportedDatabuilderError({
                        path,
                        typeName: name,
                      }),
                    );
                  }

                  const node = typeAlias.getTypeNode();
                  const isValidNodeKind =
                    node?.isKind(SyntaxKind.TypeLiteral) ||
                    node?.isKind(SyntaxKind.TypeReference);
                  if (!isValidNodeKind) {
                    return Either.left(
                      new UnsupportedBuilderTypeError({
                        path,
                        typeName: typeAlias.getName(),
                      }),
                    );
                  }

                  return Either.right({
                    name: typeAlias.getName(),
                    node,
                  });
                })
                .filter(Boolean);
            },
            catch: (cause) => new ParserError({ cause }),
          });

          const typeLiteralsWithDataBuilder = yield* Effect.all(
            eitherTypeLiteralsWithDataBuilder.map((v) => v),
          );

          const result: DataBuilderMetadata[] = yield* Effect.all(
            typeLiteralsWithDataBuilder.map(({ name, node }) =>
              typeNodeParser
                .generateMetadata({ typeNode: node, optional: false })
                .pipe(
                  Effect.map((shape) => ({ name, shape, path })),
                  Effect.catchTags({
                    UnsupportedSyntaxKindError: (cause) =>
                      Effect.fail(
                        new RichUnsupportedSyntaxKindError({
                          kind: cause.kind,
                          raw: cause.raw,
                          path,
                          typeName: name,
                        }),
                      ),
                    CannotBuildTypeReferenceMetadata: (cause) =>
                      Effect.fail(
                        new RichCannotBuildTypeReferenceMetadata({
                          kind: cause.kind,
                          raw: cause.raw,
                          path,
                          typeName: name,
                        }),
                      ),
                  }),
                ),
            ),
          );

          return result;
        },
        Effect.catchTags({
          ParserError: (cause) => Effect.die(cause),
          UnexportedDatabuilderError: (cause) =>
            Effect.dieMessage(
              `[Parser]: Unexported databuilder ${cause.typeName} at ${cause.path}`,
            ),
          RichUnsupportedSyntaxKindError: (cause) =>
            Effect.dieMessage(
              `[Parser]: Unsupported syntax kind of id: ${cause.kind} with raw type: ${cause.raw} found in type ${cause.typeName} in file ${cause.path}`,
            ),
          RichCannotBuildTypeReferenceMetadata: (cause) =>
            Effect.dieMessage(
              `[Parser]: Cannot build type reference metadata with kind of id: ${cause.kind} with raw type: ${cause.raw} found in type ${cause.typeName} in file ${cause.path}. Is it a root of databuilder?`,
            ),
          UnsupportedBuilderTypeError: (cause) =>
            Effect.dieMessage(
              `[Parser]: Unsupported builder type ${cause.typeName} in file ${cause.path}.`,
            ),
        }),
      ),
    };
  }),
  dependencies: [TypeNodeParser.Default],
}) {}

class ParserError extends Data.TaggedError('ParserError')<{
  cause: unknown;
}> {}

class UnexportedDatabuilderError extends Data.TaggedError(
  'UnexportedDatabuilderError',
)<{
  typeName: string;
  path: string;
}> {}

class UnsupportedBuilderTypeError extends Data.TaggedError(
  'UnsupportedBuilderTypeError',
)<{
  typeName: string;
  path: string;
}> {}

class RichUnsupportedSyntaxKindError extends Data.TaggedError(
  'RichUnsupportedSyntaxKindError',
)<{
  typeName: string;
  path: string;
  kind: SyntaxKind;
  raw: string;
}> {}

class RichCannotBuildTypeReferenceMetadata extends Data.TaggedError(
  'RichCannotBuildTypeReferenceMetadata',
)<{ typeName: string; path: string; kind: SyntaxKind; raw: string }> {}

export type DataBuilderMetadata = {
  name: string;
  shape: TypeNodeMetadata;
  path: string;
};
