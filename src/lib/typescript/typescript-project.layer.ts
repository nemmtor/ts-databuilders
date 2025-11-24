import * as Context from 'effect/Context';

import type * as ts from './typescript';

export class TypescriptProject extends Context.Tag(
  '@TSDataBuilders/TypescriptProject',
)<
  TypescriptProject,
  { typeChecker: ts.TypeChecker; sourceFile: ts.SourceFile }
>() {}
