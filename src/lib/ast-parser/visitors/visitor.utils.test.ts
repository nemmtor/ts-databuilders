import { describe, expect, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { createJSDocTag, createNode } from '../../typescript/__test-utils__';
import * as ts from '../../typescript/typescript';
import { GetJsDocTagsNamesFailedError } from './visitor.errors';
import { getJsDocTagsNames } from './visitor.utils';

describe('VisitorUtils', () => {
  it.effect(
    'should succeed with jsDoc tags names',
    Effect.fnUntraced(function* () {
      vi.spyOn(ts, 'getJSDocTags').mockReturnValueOnce([
        createJSDocTag({ tagName: { getText: () => 'Test' } }),
      ]);
      const node = createNode();

      const tagsNames = yield* getJsDocTagsNames(node);

      expect(tagsNames).toEqual(['Test']);
    }),
  );

  it.effect(
    'should fail with GetJsDocTagsNamesFailedError',
    Effect.fnUntraced(function* () {
      const error = new Error('error');
      vi.spyOn(ts, 'getJSDocTags').mockImplementationOnce(() => {
        throw error;
      });
      const node = createNode();

      const result = yield* getJsDocTagsNames(node).pipe(Effect.flip);

      expect(result).toBeInstanceOf(GetJsDocTagsNamesFailedError);
      expect(result.cause).toBe(error);
    }),
  );
});
