import { FileSystem } from '@effect/platform';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { Configuration } from '../configuration';

export class FileContentChecker extends Effect.Service<FileContentChecker>()(
  '@TSDataBuilders/FileContentChecker',
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const decoder = new TextDecoder();
      const { decorator } = yield* Configuration;

      return {
        check: Effect.fnUntraced(function* (filePath: string) {
          const fileContentStream = fs.stream(filePath, {
            chunkSize: 16 * 1024,
          });
          const result = yield* fileContentStream.pipe(
            Stream.map((buffer) => decoder.decode(buffer, { stream: true })),
            Stream.mapAccum('', (leftover, chunk) => {
              const combined = leftover + chunk;
              return [
                combined.slice(-decorator.length + 1),
                combined.includes(decorator),
              ];
            }),
            Stream.find(Boolean),
            Stream.runCollect,
          );
          return result;
        }),
      };
    }),
  },
) {}
