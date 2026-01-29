import { Chunk } from 'effect';

import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Effect from 'effect/Effect';
import * as Ref from 'effect/Ref';
import * as Schema from 'effect/Schema';

import * as Configuration from '../cli/configuration';
import * as CaseSchemas from '../lib/case-schemas';
import * as Process from '../lib/process';
import type * as ProjectParser from '../lib/project-parser';
import * as TemplateCompiler from '../lib/template-compiler.service';
import * as DeclarationDefaultValueGenerator from './declaration-default-value-generator.service';
import * as TypeReferenceSideEffect from './type-reference-side-effect';

export class DeclarationBuilderGenerator extends Effect.Service<DeclarationBuilderGenerator>()(
  '@TSDataBuilders/DeclarationBuilderGenerator',
  {
    effect: Effect.gen(function* () {
      const declarationDefaultValueGenerator =
        yield* DeclarationDefaultValueGenerator.DeclarationDefaultValueGenerator;
      const process = yield* Process.Process;
      const path = yield* Path.Path;
      const fs = yield* FileSystem.FileSystem;
      const templateCompiler = yield* TemplateCompiler.TemplateCompiler;
      const configuration = yield* Configuration.Configuration;
      const nameDecoder = yield* CaseSchemas.getDecoderByCase(
        configuration.fileCase,
      );

      return {
        generate: Effect.fnUntraced(function* (opts: {
          fileAbsolutePath: string;
          declaration: ProjectParser.Declaration;
        }) {
          const { declaration, fileAbsolutePath } = opts;
          const subBuilderReferenceNamesRef = yield* Ref.make<
            Chunk.Chunk<string>
          >(Chunk.empty());

          const defaultValues = yield* declarationDefaultValueGenerator
            .generate(declaration)
            .pipe(
              Effect.provideService(
                TypeReferenceSideEffect.TypeReferenceSideEffect,
                TypeReferenceSideEffect.TypeReferenceSideEffect.of({
                  onTypeReference: (typeReference) =>
                    Effect.if(
                      typeReference.jsDocTags.some(
                        (jsDocTag) =>
                          jsDocTag.name === configuration.builderJsDocTagName,
                      ),
                      {
                        onTrue: () =>
                          Ref.update(
                            subBuilderReferenceNamesRef,
                            Chunk.append(typeReference.referenceName),
                          ),
                        onFalse: () => Effect.void,
                      },
                    ),
                }),
              ),
            );

          const subBuildersReferenceNames = yield* Ref.get(
            subBuilderReferenceNamesRef,
          ).pipe(Effect.map(Chunk.dedupe));
          const subBuilders = yield* Effect.all(
            subBuildersReferenceNames.pipe(
              Chunk.map((referenceName) =>
                nameDecoder(referenceName).pipe(
                  Effect.map((name: string) => ({
                    referenceName,
                    path: `${name}${configuration.fileSuffix}`,
                  })),
                ),
              ),
            ),
            {
              concurrency: 'unbounded',
            },
          );

          const typeName = declaration.name;
          const outputDir = path.join(
            yield* process.cwd,
            configuration.outputDir,
          );
          const builderFilePath = path.resolve(
            outputDir,
            `${yield* nameDecoder(typeName)}${configuration.fileSuffix}.ts`,
          );
          const originalFilePath = path.resolve(fileAbsolutePath);
          const originalFileImportPath = path
            .relative(path.dirname(builderFilePath), originalFilePath)
            .replace(/\.ts$/, '');

          const properties = yield* Effect.all(
            declaration.propertySignatures.map(
              Effect.fnUntraced(function* (signature) {
                const isBuilder =
                  signature.typeNode.kind === 'TypeReference' &&
                  signature.typeNode.jsDocTags.some(
                    (jsDocTag) =>
                      jsDocTag.name === configuration.builderJsDocTagName,
                  );
                const name = yield* CaseSchemas.NormalizedCase.pipe(
                  Schema.decode,
                )(signature.name);
                return {
                  name: {
                    original: name,
                    pascal: yield* CaseSchemas.PascalCaseFromString.pipe(
                      Schema.decode,
                    )(name),
                  },
                  hasQuestionToken: signature.hasQuestionToken,
                  isBuilder,
                };
              }),
            ),
            { concurrency: 'unbounded' },
          );

          const template = yield* fs.readFileString(
            path.join(import.meta.dirname, 'templates/builder.hbs'),
            'utf-8',
          );
          const builderContent = yield* templateCompiler.compile(template, {
            baseDataBuilderFileName: yield* nameDecoder('dataBuilder'),
            builderSuffix: configuration.builderSuffix,
            typeName,
            originalFileImportPath,
            defaultValues,
            properties,
            subBuilders,
          });
          yield* fs.writeFileString(builderFilePath, builderContent);
        }),
      };
    }),
    dependencies: [
      DeclarationDefaultValueGenerator.DeclarationDefaultValueGenerator.Default,
      TemplateCompiler.TemplateCompiler.Default,
    ],
  },
) {}
