import * as Effect from 'effect/Effect';
import type { ParsedType } from '../parser';

export class BuilderGenerator extends Effect.Service<BuilderGenerator>()(
  'BuilderGenerator',
  {
    sync: () => {
      return {
        generate: (parsedType: ParsedType) => {
          const fileName = parsedType.name;
        },
      };
    },
  },
) {}
