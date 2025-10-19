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
  unionz: string | number | undefined | null | Date | boolean | false | true;
  nullzLiteral: null;
  falzLiteral: false;
  truzLiteral: true;
  numLiteral: 1;
  strLiteral: 'asd';
  arr: string[];
  arrUnion: (
    | {
        foo: number;
        bar: string;
        baz: boolean;
        opt?: string;
      }
    | string
    | number
    | true
  )[];
  obj: {
    str: string;
    num: number;
    bool: boolean;
    date: Date;
    undef: undefined;
    maybeString?: string;
    unionz: string | number | undefined | null | Date | boolean | false | true;
    nullzLiteral: null;
    falzLiteral: false;
    truzLiteral: true;
    numLiteral: 1;
    strLiteral: 'asd';
    arr: string[];
    arrUnion: (
      | {
          foo: number;
          bar: string;
          baz: boolean;
          opt?: string;
        }
      | string
      | number
      | true
    )[];
    obj: {
      foo: number;
      bar: string;
      baz: boolean;
      opt?: string;
    };
  };
};
