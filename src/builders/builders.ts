import * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';
import { Configuration } from '../configuration';
import type { DataBuilderMetadata } from '../parser';
import { BuilderGenerator } from './builder-generator';

export class Builders extends Effect.Service<Builders>()(
  '@TSDataBuilders/Builders',
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const builderGenerator = yield* BuilderGenerator;
      const { outputDir } = yield* Configuration;

      return {
        create: Effect.fnUntraced(function* (
          buildersMetadata: DataBuilderMetadata[],
        ) {
          const exists = yield* Effect.orDie(fs.exists(outputDir));
          if (exists) {
            yield* Effect.orDie(fs.remove(outputDir, { recursive: true }));
          }
          yield* Effect.orDie(fs.makeDirectory(outputDir, { recursive: true }));

          yield* builderGenerator.generateBaseBuilder();

          const builderNames = buildersMetadata.map((v) => v.name);
          const duplicatedBuilderNames = builderNames.filter(
            (name, index) => builderNames.indexOf(name) !== index,
          );
          const uniqueDuplicates = [...new Set(duplicatedBuilderNames)];

          if (duplicatedBuilderNames.length > 0) {
            return yield* Effect.dieMessage(
              `Duplicated builders: ${uniqueDuplicates.join(', ')}`,
            );
          }

          yield* Effect.all(
            buildersMetadata.map((builderMetadata) =>
              builderGenerator.generateBuilder(builderMetadata),
            ),
            { concurrency: 'unbounded' },
          );
        }),
      };
    }),
    dependencies: [BuilderGenerator.Default],
  },
) {}
