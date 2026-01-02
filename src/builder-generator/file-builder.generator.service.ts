import * as Effect from 'effect/Effect';

import type * as ProjectParser from '../lib/project-parser';
import * as DeclarationBuilderGenerator from './declaration-builder-generator.service';

export class FileBuilderGenerator extends Effect.Service<FileBuilderGenerator>()(
  '@TSDataBuilders/FileBuilderGenerator',
  {
    effect: Effect.gen(function* () {
      const declarationBuilderGeneration =
        yield* DeclarationBuilderGenerator.DeclarationBuilderGenerator;

      return {
        generate: Effect.fnUntraced(function* (file: ProjectParser.ParsedFile) {
          yield* Effect.all(
            file.declarations.map((declaration) =>
              declarationBuilderGeneration.generate({
                fileAbsolutePath: file.fileAbsolutePath,
                declaration,
              }),
            ),
            { concurrency: 'unbounded' },
          );
        }),
      };
    }),
    dependencies: [
      DeclarationBuilderGenerator.DeclarationBuilderGenerator.Default,
    ],
  },
) {}
