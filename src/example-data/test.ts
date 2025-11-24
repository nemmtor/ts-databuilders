import type { Fooz } from './fooz';

/** @DataBuilder */
export interface Test {
  camelCase: string;
  'kebab-case': string;
  snake_case: string;
  PascalCase: string;
  SCREAMING_SNAKE_CASE: string;
  str: string;
  strOptional?: string;
  num: number;
  bool: boolean;
  undef: undefined;
  literalString: 'foo';
  literalNumber: 1;
  literalBool: true;
  literalBigInt: 10n;
  bigIntKeyword: bigint;
  sym: symbol;
  symOptional?: symbol;
  unknownKeyword: unknown;
  // anyKeyword: any;
  // anyKeywordOptional?: any;
  // neverKeyword: never;
  arr: string[];
  obj: {
    foo: string;
  };
  tuple: [string, string];
  namedTuple: [one: string, two: string];
  restTuple: [one: string, ...rest: string[]];
  union: string | number;
  typeRef: Foo;
  interfaceRef: Bar;
  date: Date;
  promise: Promise<number>;
  map: Map<string, number>;
  set: Set<string>;
  weakmap: WeakMap<symbol, number>;
  weakset: WeakSet<symbol>;
  re: RegExp;
  error: Error;
  picked: Pick<Baz, 'foo'>;
  omitted: Omit<Baz, 'foo'>;
  partial: Partial<Baz>;
  required: Required<BazOptional>;
  nullz: null;
  nullable: BazNullable;
  nonNullable: NonNullable<Baz | null | undefined>;
  readonly: Readonly<Foo>;
  ex: Extract<'foo' | null, null>;
  rec: Record<'foo' | 'baz', string>;
  fooz: Fooz;
  // Bigg: BigInt;
  keyofFoo: keyof Foo;
  recKeyOfFoo: Record<keyof Foo, number>;
  typeofFoo: typeof foo;
  fieldOfBaz: Baz['foo'];
  complex: Record<Baz['foo'], string>;
  computed: { [x in 'foo']: string };
  inters: { foo: string } & { bar: number };
  branded: string & { __brand: 'branded' };
  readonlyArray: readonly string[];
  readonlyTuple: readonly [string, number];
  templateLiteral: `prefix-${string}-mid-${string}-suffix`;
  // voidField: void;
  // conditionalType: string extends number ? true : false;
  optionalTuple: [string, number?];
  arrayGeneric: Array<string>;
  // functionType: () => void;
  parenthesizedType: string | number;
  objectKeyword: object;
  nestedGenerics: Promise<Array<string>>;
  multipleIntersections: { a: string } & { b: number } & { c: boolean };
  complexUnion: string | number | null | undefined;
  deepNesting: Array<Promise<Map<string, Set<number>>>>;
  unionOfObjects: { a: string } | { b: number };
  // readonlyComplex: readonly Array<{ foo: string }>;
  excludeType: Exclude<'a' | 'b' | 'c', 'a'>;
  nestedTuples: [[string, number], [boolean]];
  recordWithKeyof: Record<keyof Baz, boolean>;
  awaitedType: Awaited<Promise<string>>;
  intersectionWithBranded: { x: number } & string & { __brand: 'test' };
  complexReadonly: Readonly<{ nested: readonly [string, { deep: number }] }>;
  nullableIntersection: ({ a: string } & { b: number }) | null;
}

const foo = {
  bar: '',
};

type Foo = {
  foo: string;
};

interface Bar {
  bar: string;
}

type Baz = {
  foo: 'foo';
  bar: string;
};

type BazOptional = {
  foo?: string;
  bar?: string;
};

type BazNullable = {
  foo: string | null;
  bar: string | null;
};
