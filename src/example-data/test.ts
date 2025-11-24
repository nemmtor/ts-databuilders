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
}

type Foo = {
  foo: string;
};

interface Bar {
  bar: string;
}

type Baz = {
  foo: string;
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
