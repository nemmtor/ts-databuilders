/**
 * @DataBuilder
 */
export type Bar = {
  fooz: string;
  age: number;
  isReal: boolean;
  createdAt: Date;
  hello: undefined;
  bye?: string;
  what: null;
  union: string | number | undefined | null | Date | boolean;
};
