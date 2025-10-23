import type {
  External,
  ExternalBranded,
  ExternalDiscUnionExcluded,
  ExternalExcludedDiscUnion,
  ExternalFoo1Excluded,
  ExternalNullable,
  ExternalsDiscUnion,
  ExternalsUnion,
  ExternalWithBuilder,
  ExternalWithOptionals,
  ExternalWithUtilities,
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
  externalWithUtilities: ExternalWithUtilities;
  externalWithUtilitiesOptional?: ExternalWithUtilities;
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
  pickedFoo: Pick<Foo, 'foo'>;
  omittedFoo: Omit<Foo, 'foo'>;
  combinatedFoo: Omit<Pick<Foo, 'baz' | 'bar'>, 'bar'>;
  readonlyFoo: Readonly<Foo>;
  partialFoo: Partial<Foo>;
  requiredFoo: Required<OptionalFoo>;
  externalNonNullable: NonNullable<ExternalNullable>;
  externalsUnion: ExternalsUnion;
  externalsDiscUnion: ExternalsDiscUnion;
  pickedInline: Pick<ExternalsDiscUnion, 'id'>;
  excludedExternalDiscUnion: ExternalExcludedDiscUnion;
  externalfoo1Excluded: ExternalFoo1Excluded;
  externalDiscUnionExcluded: ExternalDiscUnionExcluded;
};

type Foo = {
  baz: string;
  foo: string;
  bar: string;
};

type OptionalFoo = {
  baz?: string;
  foo?: string;
  bar?: string;
};

type FooBranded = number & { __brand: 'something' };
