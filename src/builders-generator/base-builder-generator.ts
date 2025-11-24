import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Configuration from '../cli/configuration';
import * as CaseSchemas from '../lib/case-schemas';
import * as Process from '../lib/process';

export class BaseBuilderGenerator extends Effect.Service<BaseBuilderGenerator>()(
  '@TSDataBuilders/BaseBuilderGenerator',
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const process = yield* Process.Process;
      const configuration = yield* Configuration.Configuration;

      const typeNameToFileName = Effect.fnUntraced(function* (
        typeName: string,
      ) {
        const decoderByCase = {
          kebab: CaseSchemas.KebabCaseFromString.pipe(Schema.decode),
          pascal: CaseSchemas.PascalCaseFromString.pipe(Schema.decode),
          camel: CaseSchemas.CamelCaseFromString.pipe(Schema.decode),
        };
        return yield* decoderByCase[configuration.fileCase](typeName);
      });

      return {
        generate: Effect.gen(function* () {
          const outputDir = path.join(
            yield* process.cwd,
            configuration.outputDir,
          );
          const baseBuilderPath = path.resolve(
            outputDir,
            `${yield* typeNameToFileName('dataBuilder')}.ts`,
          );
          yield* Effect.logDebug(
            `[Builders]: Creating base builder at ${baseBuilderPath}`,
          );

          yield* fs.writeFileString(
            baseBuilderPath,
            `${BASE_BUILDER_CONTENT}\n`,
          );
        }),
      };
    }),
  },
) {}

const BASE_BUILDER_CONTENT = `export abstract class DataBuilder<T> {
  private data: T;

  constructor(initialData: T) {
    this.data = initialData;
  }

  public build(): Readonly<T> {
    return structuredClone(this.data);
  }

  protected with(partial: Partial<T>): this {
    this.data = { ...this.data, ...partial };
    return this;
  }
}
`;
