import * as Context from 'effect/Context';
import type { HashMap } from 'effect/HashMap';

export interface ConfigurationShape {
  readonly decorator: string;
  readonly outputDir: string;
  readonly include: string;
  readonly fileSuffix: string;
  readonly builderSuffix: string;
  readonly defaults: HashMap<'string' | 'number' | 'boolean', string>;
}

export class Configuration extends Context.Tag('Configuration')<
  Configuration,
  ConfigurationShape
>() {}
