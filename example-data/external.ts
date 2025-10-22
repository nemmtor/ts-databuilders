export type External = {
  baz: Array<string>;
};

export type ExternalWithOptionals = {
  baz?: string;
  bar?: string;
};

/**
 * @DataBuilder
 */
export type ExternalWithBuilder = {
  baz: string;
};

export type ExternalBranded = number & { __brand: 'something' };
