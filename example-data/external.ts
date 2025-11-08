export type External = {
  baz: Array<string>;
};

export type External2 = {
  bar: Array<string>;
};

export type ExternalWithOptionals = {
  baz?: string;
  bar?: string;
};

/**
 * @DataBuilder
 */
export type ExternalWithBuilder = {
  bar: string;
};

export type ExternalBranded = number & { __brand: 'something' };
export type ExternalWithUtilities = Pick<
  Required<ExternalWithOptionals>,
  'baz'
>;

export type ExternalNullable = {
  bar: string;
} | null;

export type ExternalsUnion = External | External2;

export type ExternalExcludedDiscUnion = Extract<
  { id: '1'; value: 'foo' } | { id: '2'; value: 'bar' },
  { id: '1' }
>;

type ExternalFoo1 = {
  id: '1';
  baz: Array<string>;
};

type ExternalFoo2 = {
  id: '2';
  bar: Array<string>;
};

export type ExternalFoo1Excluded = Extract<
  ExternalFoo1 | ExternalFoo2,
  { id: '1' }
>;
export type ExternalsDiscUnion =
  | { id: '1'; external: External }
  | { id: '2'; external: External2 };
export type ExternalDiscUnionExcluded = Extract<
  ExternalsDiscUnion,
  { id: '1' }
>;

export type ExternalIntersMem1 = { bar: string };
export type ExternalIntersMem2 = { baz: string };
export type ExternalInters = ExternalIntersMem1 & ExternalIntersMem2;
