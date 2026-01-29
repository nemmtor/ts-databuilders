import * as FileSystem from '@effect/platform/FileSystem';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

export class FileContentChecker extends Effect.Service<FileContentChecker>()(
  '@TSDataBuilders/FileContentChecker',
  {
    effect: Effect.gen(function* () {
      yield* Effect.logDebug('[FileContentChecker]: Instantiating');
      const fs = yield* FileSystem.FileSystem;
      const decoder = new TextDecoder();

      return {
        check: Effect.fnUntraced(function* (opts: {
          filePath: string;
          content: string;
        }) {
          const { content, filePath } = opts;
          yield* Effect.logDebug(
            `[FileContentChecker]: Checking file content of ${filePath}`,
          );
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
            Stream.find((v): v is true => Boolean(v)),
            Stream.tap(() =>
              Effect.logDebug(
                `[FileContentChecker]: Found expected content in ${filePath}`,
              ),
            ),
            Stream.runCollect,
            Effect.map((v) => v.pipe(Chunk.get(0))),
          );
          return result;
        }),
      };
    }),
  },
) {}
