import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';

export const DEFAULT_CONFIGURABLE_DEFAULTS = {
  string: '',
  number: 0,
  boolean: false,
};

export const defaultsSchema = Schema.Struct({
  string: Schema.String,
  number: Schema.NumberFromString,
  boolean: Schema.BooleanFromString,
});

type DefaultsShape = (typeof defaultsSchema)['Type'];

interface ConfigurationShape {
  readonly jsdocTag: string;
  readonly outputDir: string;
  readonly include: string;
  readonly fileSuffix: string;
  readonly builderSuffix: string;
  readonly defaults: DefaultsShape;
}

export class Configuration extends Context.Tag('Configuration')<
  Configuration,
  ConfigurationShape
>() {}
