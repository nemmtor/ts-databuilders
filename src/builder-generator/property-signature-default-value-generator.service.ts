import * as Effect from 'effect/Effect';

import type * as ProjectParser from '../lib/project-parser';
import type * as TypeNodeDefaultValueGeneratorError from './type-node-default-value-generator.error';
import * as TypeNodeDefaultValueGenerator from './type-node-default-value-generator.service';

export class PropertySignatureDefaultValueGenerator extends Effect.Service<PropertySignatureDefaultValueGenerator>()(
  '@TSDataBuilders/PropertySignatureDefaultValueGenerator',
  {
    effect: Effect.gen(function* () {
      const typeNodeDefaultValueGenerator =
        yield* TypeNodeDefaultValueGenerator.TypeNodeDefaultValueGenerator;

      const generatePropertySignature: (
        propertySignature: ProjectParser.PropertySignature,
      ) => Effect.Effect<
        Record<PropertyKey, string>,
        TypeNodeDefaultValueGeneratorError.TypeNodeDefaultValueGeneratorError
      > = Effect.fnUntraced(function* (
        propertySignature: ProjectParser.PropertySignature,
      ) {
        if (propertySignature.hasQuestionToken) {
          return {};
        }

        // TODO: check if it should be a builder
        return {
          [propertySignature.name]:
            yield* typeNodeDefaultValueGenerator.generate(
              propertySignature.typeNode,
              {
                onPropertySignature: generatePropertySignature,
              },
            ),
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
