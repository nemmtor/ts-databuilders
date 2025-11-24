import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import { describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Configuration, DEFAULT_CONFIGURATION } from '../cli/configuration';
import { Process } from '../lib/process';
import { BaseBuilderGenerator } from './base-builder-generator';

const fsWriteFileStringMock = vi.fn(() => Effect.void);

const TestLayer = BaseBuilderGenerator.Default.pipe(
  Layer.provide(
    Layer.succeed(Process, Process.make({ cwd: Effect.succeed('cwd') })),
  ),
  Layer.provide(
    Layer.succeed(Configuration, Configuration.of(DEFAULT_CONFIGURATION)),
  ),
  Layer.provide(Path.layer),
  Layer.provide(
    FileSystem.layerNoop({
      writeFileString: fsWriteFileStringMock,
    }),
  ),
);

describe('BaseBuilderGenerator', () => {
  it.layer(TestLayer)((it) => {
    it.effect(
      'should be successfully instantiated',
      Effect.fnUntraced(function* () {
        const baseBuilderGenerator = yield* BaseBuilderGenerator;

        expect(baseBuilderGenerator).toBeDefined();
      }),
    );

    it.effect(
      'should generate base builder',
      Effect.fnUntraced(function* () {
        const baseBuilderGenerator = yield* BaseBuilderGenerator;

        yield* baseBuilderGenerator.generate;

        expect(fsWriteFileStringMock).toHaveBeenCalledWith(
          expect.stringMatching(
            new RegExp(
              `/cwd/${DEFAULT_CONFIGURATION.outputDir}/data-builder\\.ts$`,
            ),
          ),
          expect.any(String),
        );
      }),
    );
  });
});
