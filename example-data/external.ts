export type External = {
  baz: string;
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
