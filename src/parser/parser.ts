import * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';
import { Project } from 'ts-morph';
import {
  buildTypeLiteralShape,
  type TypeLiteralShape,
} from './build-node-shape';
import { getJsDocTags } from './get-js-doc-tags';
import { getTypeLiteralNodes } from './get-type-literal-nodes';

export type ParsedType = {
  name: string;
  shape: TypeLiteralShape;
  path: string;
};

export class Parser extends Effect.Service<Parser>()('@TSDataBuilders/Parser', {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    return {
      parse: Effect.fnUntraced(function* (path: string, decorator: string) {
        const sourceCode = yield* fs.readFileString(path);
        const project = new Project();
        const file = project.createSourceFile(path, sourceCode, {
          overwrite: true,
        });
        const typeAliases = file.getTypeAliases();
        const typeAliasesWithDataBuilder = typeAliases.filter((typeAlias) =>
          getJsDocTags(typeAlias).includes(decorator),
        );

        const typeLiteralNodes = getTypeLiteralNodes(
          typeAliasesWithDataBuilder,
        );

        const result: ParsedType[] = yield* Effect.all(
          typeLiteralNodes.map(({ name, node }) =>
            buildTypeLiteralShape(node).pipe(
              Effect.map((shape) => ({ name, shape, path })),
            ),
          ),
        );

        return result;
      }),
    };
  }),
}) {}
