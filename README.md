# 🧱 TS DataBuilders
A CLI tool that automatically generates builder classes from annotated TypeScript types.

## Usage
Install the package:
```bash
pnpm add -D @nemmtor/ts-databuilders
```

Annotate the types you want to build with JsDoc tag:
```ts
/**
 * @DataBuilder
 */
type Example = {
  bar: string;
  baz: string;
}
```

Run the command:
```bash
pnpm ts-databuilders
```
By default it tries to find annotated types in `src/**/*.ts{,x}` and outputs builders in `generated/builders`.
Above and much more is configurable - check out configuration section.

Above example will result in output:
```ts
import type { Example } from "../../src/example";
import { DataBuilder } from "./data-builder";

export class ExampleBuilder extends DataBuilder<Example> {
    constructor() {
        super({
          bar: "",
          baz: ""
        });
    }

    withBar(bar: Example['bar']) {
        return this.with({ bar: bar });
    }

    withBaz(baz: Example['baz']) {
        return this.with({ baz: baz });
    }
}
```

## Configuration
> [!NOTE]
> Name column is equal to field names in ts-databuilders.json file.

| Name          | Flag            | Description                                                    | Default                                          | Type       |
|---------------|-----------------|----------------------------------------------------------------|--------------------------------------------------|------------|
| jsdocTag      | --jsdoc-tag      | JSDoc tag used to mark types for data building generation.     | DataBuilder                                      | string     |
| outputDir     | --output-dir -o  | Output directory for generated builders.                       | generated/builders                               | string     |
| include       | --include -i    | Glob pattern for files included while searching for jsdoc tag. | src/**/*.ts{,x}                                  | string     |
| fileSuffix    | --file-suffix   | File suffix for created builder files.                         | .builder                                         | string     |
| builderSuffix | --builder-suffix | Suffix for generated classes.                                  | Builder                                          | string     |
| defaults      | --defaults      | Default values to be used in data builder constructor.         | {   string: '',   number: 0,   boolean: false, } | object/map |

All of the above flags are optional and are having sensible defaults which should be good enough for most cases.
You can configure these via cli flags or by creating `ts-databuilders.json` file in the root of your repository.
Example of config file:
```json
{
  "$schema": "https://raw.githubusercontent.com/nemmtor/ts-databuilders/refs/heads/main/schema.json",
  "include": "example-data/**",
  "builderSuffix": "GeneratedBuilder",
  "fileSuffix": ".generated-builder",
  "jsdocTag": "GenerateBuilder",
  "outputDir": "generated-builders/",
  "defaults": {
    "boolean": true,
    "number": 2000,
    "string": "foo"
  }
}
```

Priority when resolving config values is:
1. Cli flags
2. Config file values
3. Hardcoded defaults

## Motivation
When writing tests you often want to test some scenario that is happening when
one of the input values is in a specific shape.
Often times this value is only one of many options provided.

Imagine testing a case where document aggregate should emit an event when it successfully
update it's content:
```ts
it('should emit a ContentUpdatedEvent', () => {
  const aggregate = DocumentAggregate.create({
    id: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    content: 'old-content'
  });
  const userId = '1';

  aggregate.updateContent({ updatedBy: userId, content: 'new-content' });

  expect(...);
})
```
Above code obfuscated with all of the default values you need to provide in order to satisfy typescript.
Where in reality the only thing specific to this single test is the fact that some new content was provided to `updateContent` method.

Imagine even more complex scenario:
```tsx
it('should show validation error when email is invalid', async () => {
  render(<ProfileForm defaultValues={
      firstName: '',
      lastName: '',
      age: 0,
      socials: {
        linkedin: '',
        github: '',
        website: '',
        twitter: '',
      },
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
      },
      skills: [],
      bio: '',
      email: 'invalid-email'
    }
  />)

  await submitForm();

  expect(...);
})
```
Again - in reality you should only be worried about email, not about whole form data.

Here's how above tests could be written with databuilders:
```ts
it('should emit a ContentUpdatedEvent', () => {
  const aggregate = DocumentAggregate.create(new CreateDocumentAggregatedPayloadBuilder().build());

  aggregate.updateContent(new UpdateDocumentContentPayloadBuilder().withContent('new-content').build());

  expect(...);
})
```

```tsx
it('should show validation error when email is invalid', async () => {
  render(<ProfileForm defaultValues={new ProfileFormInputBuilder.withEmail('invalid-email').build()} />)

  await submitForm();

  expect(...);
})
```

This not only makes the test code less verbose but also highlights what is really being tested.

## Nested builders
TODO

## Supported types
TODO
