import { FileSystem } from '@effect/platform';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

export class FileContentChecker extends Effect.Service<FileContentChecker>()(
  '@TSDataBuilders/FileContentChecker',
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const decoder = new TextDecoder();

      return {
        check: Effect.fnUntraced(function* (opts: {
          filePath: string;
          content: string;
        }) {
          const { content, filePath } = opts;
          const fileContentStream = Stream.orDie(
            fs.stream(filePath, {
              chunkSize: 16 * 1024,
            }),
          );
          const result = yield* fileContentStream.pipe(
            Stream.map((buffer) => decoder.decode(buffer, { stream: true })),
            Stream.mapAccum('', (leftover, chunk) => {
              const combined = leftover + chunk;
              return [
                combined.slice(-content.length + 1),
                combined.includes(content),
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
