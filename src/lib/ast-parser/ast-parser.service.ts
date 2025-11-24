import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as TypescriptProject from '../typescript/typescript-project.layer';
import * as TypescriptUtils from '../typescript/typescript-utils.service';
import * as Visitor from './visitors/visitor';
import * as VisitorLayer from './visitors/visitor.layer';

export class ASTParser extends Effect.Service<ASTParser>()(
  '@TSDataBuilders/ASTParser',
  {
    effect: Effect.gen(function* () {
      const tsUtils = yield* TypescriptUtils.TypescriptUtils;

      const parseWithoutDependencies = Effect.gen(function* () {
        const typescriptProject = yield* TypescriptProject.TypescriptProject;
        const sourceFileVisitor = yield* Visitor.SourceFileVisitor;
        return yield* sourceFileVisitor.visit(typescriptProject.sourceFile);
      });

      return {
        parseWithoutDependencies,
        parse: (filePath: string) =>
          Effect.gen(function* () {
            const typescriptProject = yield* tsUtils.createProject(filePath);
            return yield* parseWithoutDependencies.pipe(
              Effect.provide(
                Layer.provideMerge(
                  Layer.succeed(
                    TypescriptProject.TypescriptProject,
                    TypescriptProject.TypescriptProject.of(typescriptProject),
                  ),
                  VisitorLayer.VisitorLayer,
                ),
              ),
            );
          }),
      };
    }),
    dependencies: [TypescriptUtils.TypescriptUtils.Default],
  },
) {}
