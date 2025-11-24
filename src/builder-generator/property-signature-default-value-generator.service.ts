import * as Effect from 'effect/Effect';

import * as Configuration from '../cli/configuration';
import type * as ProjectParser from '../lib/project-parser';
import type * as TypeNodeDefaultValueGeneratorError from './type-node-default-value-generator.error';
import * as TypeNodeDefaultValueGenerator from './type-node-default-value-generator.service';
import type * as TypeReferenceSideEffect from './type-reference-side-effect';

export class PropertySignatureDefaultValueGenerator extends Effect.Service<PropertySignatureDefaultValueGenerator>()(
  '@TSDataBuilders/PropertySignatureDefaultValueGenerator',
  {
    effect: Effect.gen(function* () {
      const typeNodeDefaultValueGenerator =
        yield* TypeNodeDefaultValueGenerator.TypeNodeDefaultValueGenerator;
      const { inlineDefaultJsDocTagName } = yield* Configuration.Configuration;

      const generatePropertySignature: (
        propertySignature: ProjectParser.PropertySignature,
      ) => Effect.Effect<
        Record<PropertyKey, string>,
        TypeNodeDefaultValueGeneratorError.TypeNodeDefaultValueGeneratorError,
        TypeReferenceSideEffect.TypeReferenceSideEffect
      > = Effect.fnUntraced(function* (propertySignature) {
        if (propertySignature.hasQuestionToken) {
          return {};
        }

        const defaultValue =
          propertySignature.jsDocTags.find(
            (jsDocTag) => jsDocTag.name === inlineDefaultJsDocTagName,
          )?.comment ??
          (yield* typeNodeDefaultValueGenerator.generate(
            propertySignature.typeNode,
            {
              onPropertySignature: generatePropertySignature,
            },
          ));

        return {
          [propertySignature.name]: defaultValue,
        };
      });

      return {
        generate: generatePropertySignature,
      };
    }),
    dependencies: [
      TypeNodeDefaultValueGenerator.TypeNodeDefaultValueGenerator.Default,
    ],
  },
) {}
