import * as FileSystem from '@effect/platform/FileSystem';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import type { DataBuilderMetadata } from '../parser';
import { BuilderGenerator } from './builder-generator';

export class Builders extends Effect.Service<Builders>()(
  '@TSDataBuilders/Builders',
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const builderGenerator = yield* BuilderGenerator;
      const outputDir = yield* Config.string('outputDir');

      return {
        create: Effect.fnUntraced(function* (metadata: DataBuilderMetadata[]) {
          const exists = yield* fs.exists(outputDir);
          if (exists) {
            yield* fs.remove(outputDir, { recursive: true });
          }
          yield* fs.makeDirectory(outputDir, { recursive: true });

          yield* builderGenerator.generateBaseBuilder();

          yield* Effect.all(
            metadata.map((builderMetadata) =>
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
