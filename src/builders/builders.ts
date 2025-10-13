import * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';
import type { DataBuilderMetadata } from '../parser';
import { BuilderGenerator } from './builder-generator';

export class Builders extends Effect.Service<Builders>()(
  '@TSDataBuilders/Builders',
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const builderGenerator = yield* BuilderGenerator;

      return {
        create: Effect.fnUntraced(function* (
          metadata: DataBuilderMetadata[],
          outDir: string,
        ) {
          yield* fs.makeDirectory(outDir, { recursive: true });

          yield* builderGenerator.generateBaseBuilder(outDir);

          yield* Effect.all(
            metadata.map((builderMetadata) =>
              builderGenerator.generateBuilder(builderMetadata, outDir),
            ),
            { concurrency: 'unbounded' },
          );
        }),
      };
    }),
    dependencies: [BuilderGenerator.Default],
  },
) {}
