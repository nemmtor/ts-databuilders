import * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as BuilderGenerator from '../builder-generator';
import * as Finder from '../lib/finder';
import * as ProjectParser from '../lib/project-parser';
import * as Configuration from './configuration';

export const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const finder = yield* Finder.Finder;
  const projectParser = yield* ProjectParser.ProjectParser;
  const fileBuilderGenerator = yield* BuilderGenerator.FileBuilderGenerator;
  const baseBuilderGenerator = yield* BuilderGenerator.BaseBuilderGenerator;
  const { include, builderJsDocTagName, outputDir } =
    yield* Configuration.Configuration;

  yield* Effect.logInfo(
    `Scanning '${include}' for files including types annotated with '@${builderJsDocTagName}'.`,
  );

  const filePaths = yield* finder.find({
    include,
    pattern: `@${builderJsDocTagName}`,
  });
  if (filePaths.length === 0) {
    yield* Effect.logInfo('Nothing to generate.');
    return;
  }

  yield* Effect.logInfo(
    `Found ${filePaths.length} file(s), parsing it to understand data shape.`,
  );
  const parsedFiles = yield* projectParser.parseFiles(filePaths);

  yield* Effect.logInfo(`Generating builders.`);
  yield* fs.makeDirectory(outputDir, {
    recursive: true,
  });
  yield* baseBuilderGenerator.generate;
  yield* Effect.all(
    parsedFiles.flatMap((file) => fileBuilderGenerator.generate(file)),
    { concurrency: 'unbounded' },
  );

  const createdBuildersCount = parsedFiles.flatMap(
    (file) => file.declarations,
  ).length;
  yield* Effect.logInfo(`Created ${createdBuildersCount} builder(s).`);
});

export const ParseDeclarationPredicateLayer = Layer.effect(
  ProjectParser.ParseDeclarationPredicate,
  Effect.gen(function* () {
    const configuration = yield* Configuration.Configuration;

    return (opts: {
      isExported: boolean;
      jsDocTags: ProjectParser.JsDocTag[];
    }) => {
      if (!opts.isExported) {
        return Effect.succeed(false);
      }

      if (
        !opts.jsDocTags.some(
          (jsDocTag) => jsDocTag.name === configuration.builderJsDocTagName,
        )
      ) {
        return Effect.succeed(false);
      }
      return Effect.succeed(true);
    };
  }),
);
