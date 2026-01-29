import * as Effect from 'effect/Effect';

import type * as ProjectParser from '../lib/project-parser';
import * as PropertySignatureValueGenerator from './property-signature-default-value-generator.service';
import { stringifyObjectLiteral } from './stringify-object-literal';

export class DeclarationDefaultValueGenerator extends Effect.Service<DeclarationDefaultValueGenerator>()(
  '@TSDataBuilders/DeclarationDefaultValueGenerator',
  {
    effect: Effect.gen(function* () {
      const propertySignatureValueGenerator =
        yield* PropertySignatureValueGenerator.PropertySignatureDefaultValueGenerator;

      return {
        generate: Effect.fnUntraced(function* (
          declaration: ProjectParser.Declaration,
        ) {
          const propertySignatures = yield* Effect.all(
            declaration.propertySignatures.map((propertySignature) =>
              propertySignatureValueGenerator.generate(propertySignature),
            ),
          );

          const result: Record<PropertyKey, string> = Object.assign(
            {},
            ...propertySignatures,
          );
          return stringifyObjectLiteral(result);
        }),
      };
    }),
    dependencies: [
      PropertySignatureValueGenerator.PropertySignatureDefaultValueGenerator
        .Default,
    ],
  },
) {}
