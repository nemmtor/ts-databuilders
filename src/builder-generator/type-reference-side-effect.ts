import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import type * as ProjectParser from '../lib/project-parser';

export class TypeReferenceSideEffect extends Context.Tag(
  '@TSDataBuilders/TypeReferenceSideEffect',
)<
  TypeReferenceSideEffect,
  {
    onTypeReference: (
      typeReference: ProjectParser.TypeReference,
    ) => Effect.Effect<void>;
  }
>() {}
