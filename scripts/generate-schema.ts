import * as FileSystem from '@effect/platform/FileSystem';
import * as NodeContext from '@effect/platform-node/NodeContext';
import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import * as Effect from 'effect/Effect';
import * as JSONSchema from 'effect/JSONSchema';

import * as Configuration from '../src/configuration';

const jsonSchema = JSON.stringify(
  JSONSchema.make(Configuration.ConfigurationFileSchema),
  null,
  2,
);

const program = Effect.gen(function* (_) {
  const fs = yield* _(FileSystem.FileSystem);
  yield* Effect.log('Writing config schema');
  yield* fs.writeFileString('schema.json', `${jsonSchema}\n`);
  yield* Effect.log('Wrote schema to ./schema.json');
});

program.pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
