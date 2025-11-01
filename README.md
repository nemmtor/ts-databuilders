# 🧱 TS DataBuilders
Automatically generate type-safe builder classes from your TypeScript types to write cleaner, more focused tests.

## Installation
Install the package:
```bash
# npm
npm install -D @nemmtor/ts-databuilders

# pnpm
pnpm add -D @nemmtor/ts-databuilders

# yarn
yarn add -D @nemmtor/ts-databuilders
```

## Configuration
All configuration is optional with sensible defaults.

### Initialize Config File (optional)
Generate a default `ts-databuilders.json` configuration file:
```bash
pnpm ts-databuilders init
```
You can also generate configuration file by providing values step by step in an interactive wizard:
```bash
pnpm ts-databuilders init --wizard
```

### Configure via CLI flags (optional):
```bash
pnpm ts-databuilders --output-dir="src/__generated__" --jsdoc-tag=MyBuilder
```
You can also provide configuration by going through interactive wizard:
```bash
pnpm ts-databuilders --wizard
```

### Options Reference

| Name          | Flag                                                  | Description                             | Default              |
|---------------|-------------------------------------------------------|-----------------------------------------|----------------------|
| jsdocTag      | `--jsdoc-tag`                                         | JSDoc tag to mark types for generation  | `DataBuilder`        |
| outputDir     | `--output-dir -o`                                     | Output directory for generated builders | `generated/builders` |
| include       | `--include -i`                                        | Glob pattern for source files           | `src/**/*.ts{,x}`    |
| fileSuffix    | `--file-suffix`                                       | File suffix for builder files           | `.builder`           |
| builderSuffix | `--builder-suffix`                                    | Class name suffix                       | `Builder`            |
| defaults      | `--default-string --default-number --default-boolean` | Default values for primitives           | See example above    |

**Priority:** CLI flags > Config file > Built-in defaults

## Quick Start
**1. Annotate your types with JSDoc:**
```ts
/**
 * @DataBuilder
 */
type User = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
}
```
**2. Generate builders:**
```bash
pnpm ts-databuilders
```
For the `User` type above, you'll get:
```ts
import type { User } from "...";
import { DataBuilder } from "./data-builder";

export class UserBuilder extends DataBuilder<User> {
    constructor() {
        super({
          id: "",
          email: "",
          name: "",
          isActive: false
        });
    }

    withId(id: User['id']) {
        return this.with({ id });
    }

    withEmail(email: User['email']) {
        return this.with({ email });
    }

    withName(name: User['name']) {
        return this.with({ name });
    }

    withIsActive(isActive: User['isActive']) {
        return this.with({ isActive });
    }
}
```

**3. Use in your tests:**
```ts
import { UserBuilder } from '...';

const testUser = new UserBuilder()
  .withEmail('test@example.com')
  .withIsActive(false)
  .build();
```

## Why?
Tests often become cluttered with boilerplate when you need to create complex objects just to test one specific field. DataBuilders let you focus on what matters:
Imagine testing a case where document aggregate should emit an event when it successfully update it's content:
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
Above code is obfuscated with all of the default values you need to provide in order to satisfy typescript.
Where in reality the only thing specific to this single test is the fact that some new content was provided to `updateContent` method.

Imagine even more complex scenario:
```tsx
it('should show validation error when email is invalid', async () => {
  render(<ProfileForm defaultValues={{
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
    }}
  />)

  await submitForm();

  expect(...);
})
```
Again - in reality you should only be worried about email, not about whole form data.

Here's how above tests could be written with databuilders:
```ts
it('should emit a ContentUpdatedEvent', () => {
  const aggregate = DocumentAggregate.create(
    new CreateDocumentAggregatedPayloadBuilder().build()
  );

  aggregate.updateContent(
    new UpdateDocumentContentPayloadBuilder().withContent('new-content').build()
  );

  expect(...);
})
```

```tsx
it('should show validation error when email is invalid', async () => {
  render(<ProfileForm defaultValues={
    new ProfileFormInputBuilder.withEmail('invalid-email').build()} />
  )

  await submitForm();

  expect(...);
})
```

This not only makes the test code less verbose but also highlights what is really being tested.

**Why not use AI for that?** While AI can generate test data, ts-databuilders is fast, free and deterministic.

[Read more about data builders.](http://www.natpryce.com/articles/000714.html)

## Nested Builders
When your types contain complex nested objects, you can annotate their type definitions and TS DataBuilders will automatically generate nested builders, allowing you to compose them fluently.
### Example

**Input types:**
```ts
/**
 * @DataBuilder
 */
export type User = {
  name: string;
  address: Address;
};

/**
 * @DataBuilder
 */
export type Address = {
  street: string;
  city: string;
  country: string;
};
```
**Generated builders:**
```ts
export class UserBuilder extends DataBuilder<User> {
    constructor() {
        super({
          name: "",
          address: new AddressBuilder().build();
        });
    }

    withName(name: User['name']) {
        return this.with({ name });
    }

    withAddress(address: DataBuilder<User['address']>) {
        return this.with({ address: address.build() });
    }
}

export class AddressBuilder extends DataBuilder<Address> {
    constructor() {
        super({
          street: "",
          city: "",
          country: ""
        });
    }

    withStreet(street: Address['street']) {
        return this.with({ street });
    }

    withCity(city: Address['city']) {
        return this.with({ city });
    }

    withCountry(country: Address['country']) {
        return this.with({ country });
    }
}
```
**Usage:**
```ts
// ✅ Compose builders fluently
const user = new UserBuilder()
  .withName('John Doe')
  .withAddress(
    new AddressBuilder()
      .withStreet('123 Main St')
      .withCity('New York')
  )
  .build();
// {..., address: { street: "123 Main st", city: "New York", country: "" } }

// ✅ Use default values
const userWithDefaultAddress = new UserBuilder().build();
// {..., address: { street: "", city: "", country: "" } }

// ✅ Override just one nested field
const userWithCity = new UserBuilder()
  .withAddress(
    new AddressBuilder()
      .withCity('San Francisco')
  )
  .build();
// {..., address: { street: "", city: "San Francisco", country: "" } }
```

### Supported Types

The library supports a wide range of TypeScript type features:

✅ **Primitives & Built-ins**
- `string`, `number`, `boolean`, `Date`
- Literal types: `'active' | 'inactive'`, `1 | 2 | 3`

✅ **Complex Structures**
- Objects and nested objects
- Arrays: `string[]`, `Array<number>`
- Tuples: `[string, number]`
- Records: `Record<string, string>` `Record<'foo' | 'bar', string>`

✅ **Type Operations**
- Unions: `string | number | true | false`
- Intersections: `A & B`
- Utility types: `Pick<T, K>`, `Omit<T, K>`, `Partial<T>`, `Required<T>`, `Readonly<T>`, `Extract<T, U>`, `NonNullable<T>`
- Branded types: `type UserId = string & { __brand: 'UserId' }`

✅ **References**
- Type references from the same file
- Type references from other files
- External library types (e.g., `z.infer<typeof schema>`)

**For a comprehensive example** of supported types, check out the [example-data/bar.ts](https://github.com/nemmtor/ts-databuilders/blob/main/example-data/bar.ts) file in the repository. This file is used during development and demonstrates complex real-world type scenarios.

## Important Rules & Limitations

### Unique Builder Names
Each type annotated with the JSDoc tag must have a **unique name** across your codebase:
```ts
// ❌ Error: Duplicate builder names
// In file-a.ts
/** @DataBuilder */
export type User = { name: string };

// In file-b.ts
/** @DataBuilder */
export type User = { email: string };  // 💥 Duplicate!
```

### Exported Types Only
Types must be **exported** to generate builders:
```ts
// ❌ Won't work
/** @DataBuilder */
type User = { name: string };

// ✅ Works
/** @DataBuilder */
export type User = { name: string };
```

### Type Aliases Only
Currently, only **type aliases** are supported as root builder types. Interfaces, classes etc. are not supported:
```ts
// ❌ Not supported
/** @DataBuilder */
export interface User {
  name: string;
}

// ❌ Not supported
/** @DataBuilder */
export class User {
  name: string;
}

// ✅ Supported
/** @DataBuilder */
export type User = {
  name: string;
};
```

### Unsupported TypeScript Features

Some TypeScript features are not yet supported and will cause generation errors:

- **Recursive types**: Types that reference themselves
```ts
  // ❌ Not supported
  type TreeNode = {
    value: string;
    children: TreeNode[];  // Self-reference
  };
```

- **Function types**: Properties that are functions
```ts
  // ❌ Not supported
  type WithCallback = {
    onSave: (data: string) => void;
  };
```

- typeof, keyof, any, unknown, bigint, symbol

### Alpha Stage
⚠️ **This library is in active development**

- Breaking changes may occur
- Not all edge cases are covered yet
- Test thoroughly before using in production

**Found an issue?** Please [report it on GitHub](https://github.com/nemmtor/ts-databuilders/issues) with:
- The type definition causing the issue
- The error message received
- Your `ts-databuilders.json` config and any provided CLI flags (if applicable)

Your feedback helps improve the library for everyone! 🙏

## Similar Projects
- [effect-builder](https://github.com/slashlifeai/effect-builder) - a runtime library for building objects with Effect Schema validation.

## Contributing

Contributions welcome! Please open an issue or PR on [GitHub](https://github.com/nemmtor/ts-databuilders).

## License

MIT © [nemmtor](https://github.com/nemmtor)
