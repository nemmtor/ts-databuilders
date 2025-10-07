import * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';
import {
  buildTypeLiteralShape,
  type TypeLiteralShape,
} from './build-node-shape';
import { createSourceFile } from './create-source-file';
import { getJsDocTags } from './get-js-doc-tags';
import { getTypeLiteralNodes } from './get-type-literal-nodes';

export type ParsedType = {
  name: string;
  shape: TypeLiteralShape;
};

export class Parser extends Effect.Service<Parser>()('Parser', {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    return {
      parse: Effect.fnUntraced(function* (path: string, decorator: string) {
        const sourceCode = yield* fs.readFileString(path);
        const sourceFile = yield* createSourceFile(path, sourceCode);

        const typeAliases = sourceFile.getTypeAliases();
        const typeAliasesWithDataBuilder = typeAliases.filter((typeAlias) =>
          getJsDocTags(typeAlias).includes(decorator),
        );

        const typeLiteralNodes = getTypeLiteralNodes(
          typeAliasesWithDataBuilder,
        );

        const result: ParsedType[] = yield* Effect.all(
          typeLiteralNodes.map(({ name, node }) =>
            buildTypeLiteralShape(node).pipe(
              Effect.map((shape) => ({ name, shape })),
            ),
          ),
        );

        return result;
      }),
    };
  }),
}) {}
