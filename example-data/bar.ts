/**
 * @DataBuilder
 */
export type Bar = {
  str: string;
  num: number;
  bool: boolean;
  date: Date;
  undef: undefined;
  maybeString?: string;
  nullz: null;
  unionz: string | number | undefined | null | Date | boolean | false | true;
  falz: false;
  truz: true;
};
