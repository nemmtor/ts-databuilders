import type {
  External,
  ExternalBranded,
  ExternalWithBuilder,
  ExternalWithOptionals,
} from './external';

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
  tuple: [string, number, 'xd', 1];
  'foo-bar-optional'?: 'foo-bar';
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
    'foo-bar': 'foo-bar';
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
  fooRec: Record<'foo-bar', Record<'nested', { name: string }>>;
  foo: Foo;
  external: External;
  externalOptional?: External;
  externalWithOptionals: ExternalWithOptionals;
  externalWithBuilder: ExternalWithBuilder;
  externalWithBuilderOptional?: ExternalWithBuilder;
  'weird-name-with-builder': ExternalWithBuilder;
  arrayOfBuilders: ExternalWithBuilder[];
  brandedNumber: number & { __brand: 'something' };
  brandedString: string & { __brand: 'something' };
  brandedBoolean: boolean & { __brand: 'something' };
  brandedNumberOptional?: number & { __brand: 'something' };
  brandedStringOptional?: string & { __brand: 'something' };
  brandedBooleanOptional?: boolean & { __brand: 'something' };
  fooBranded: FooBranded;
  externalBranded: ExternalBranded;
};

type Foo = {
  baz: string;
};

type FooBranded = number & { __brand: 'something' };
