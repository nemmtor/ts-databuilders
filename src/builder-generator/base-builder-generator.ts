import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Effect from 'effect/Effect';

import * as Configuration from '../cli/configuration';
import * as CaseSchemas from '../lib/case-schemas';
import * as Process from '../lib/process';
import * as TemplateCompiler from '../lib/template-compiler.service';

export class BaseBuilderGenerator extends Effect.Service<BaseBuilderGenerator>()(
  '@TSDataBuilders/BaseBuilderGenerator',
  {
    effect: Effect.gen(function* () {
      const path = yield* Path.Path;
      const process = yield* Process.Process;
      const configuration = yield* Configuration.Configuration;
      const fs = yield* FileSystem.FileSystem;
      const templateCompiler = yield* TemplateCompiler.TemplateCompiler;

      const nameDecoder = yield* CaseSchemas.getDecoderByCase(
        configuration.fileCase,
      );

      return {
        generate: Effect.gen(function* () {
          const outputDir = path.join(
            yield* process.cwd,
            configuration.outputDir,
          );
          const baseBuilderPath = path.resolve(
            outputDir,
            `${yield* nameDecoder('dataBuilder')}.ts`,
          );
          const template = yield* fs.readFileString(
            path.join(import.meta.dirname, 'templates/base-builder.hbs'),
            'utf-8',
          );
          yield* Effect.logDebug(
            `[Builders]: Creating base builder at ${baseBuilderPath}`,
          );

          yield* fs.writeFileString(
            baseBuilderPath,
            yield* templateCompiler.compile(template),
          );
        }),
      };
    }),
    dependencies: [TemplateCompiler.TemplateCompiler.Default],
  },
) {}
