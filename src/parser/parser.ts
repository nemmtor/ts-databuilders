import * as FileSystem from '@effect/platform/FileSystem';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import { Project, SyntaxKind } from 'ts-morph';
import { Configuration } from '../configuration';
import {
  type TypeLiteralMetadata,
  TypeLiteralParser,
} from './type-literal-parser';

export class Parser extends Effect.Service<Parser>()('@TSDataBuilders/Parser', {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const typeLiteralParser = yield* TypeLiteralParser;
    const { decorator } = yield* Configuration;

    return {
      generateBuildersMetadata: Effect.fnUntraced(function* (path: string) {
        const sourceCode = yield* fs.readFileString(path);
        const typeLiteralsWithDataBuilder = yield* Effect.try({
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
                    jsDoc.getTags().flatMap((tag) =>
                      tag
                        .getText()
                        .split('\n')
                        .map((v) => v.trim())
                        .filter((v) => v !== '*' && v !== ''),
                    ),
                  )
                  .includes(decorator),
              );

            return typeAliasesWithDataBuilder
              .map((typeAlias) => {
                const node = typeAlias.getTypeNode();
                if (!node || !node.isKind(SyntaxKind.TypeLiteral)) {
                  return undefined;
                }

                return {
                  name: typeAlias.getName(),
                  node,
                };
              })
              .filter(Boolean);
          },
          catch: (cause) => new ParserError({ cause }),
        });

        const result: DataBuilderMetadata[] = yield* Effect.all(
          typeLiteralsWithDataBuilder.map(({ name, node }) =>
            typeLiteralParser
              .generateMetadata(node)
              .pipe(Effect.map((shape) => ({ name, shape, path }))),
          ),
        );

        return result;
      }),
    };
  }),
  dependencies: [TypeLiteralParser.Default],
}) {}

class ParserError extends Data.TaggedError('ParserError')<{
  cause: unknown;
}> {}

export type DataBuilderMetadata = {
  name: string;
  shape: TypeLiteralMetadata;
  path: string;
};
