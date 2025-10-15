import * as Context from 'effect/Context';

export interface ConfigurationShape {
  readonly decorator: string;
  readonly outputDir: string;
  readonly include: string;
  readonly fileSuffix: string;
  readonly builderSuffix: string;
}

export class Configuration extends Context.Tag('Configuration')<
  Configuration,
  ConfigurationShape
>() {}
