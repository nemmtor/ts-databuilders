import * as Path from '@effect/platform/Path';
import * as Effect from 'effect/Effect';

import * as ts from '../typescript';
import * as ParserError from './parser.error';
import * as SyntaxListParser from './syntax-list-parser.service';

export class SourceFileParser extends Effect.Service<SourceFileParser>()(
  '@TSDataBuilders/SourceFileParser',
  {
    effect: Effect.gen(function* () {
      const syntaxListParser = yield* SyntaxListParser.SyntaxListParser;
      const path = yield* Path.Path;

      return {
        parse: (sourceFile: ts.SourceFile) =>
          Effect.gen(function* () {
            const children = yield* Effect.try({
              try: () => sourceFile.getChildren(),
              catch: (cause) => new ParserError.GetNodeChildrenError({ cause }),
            });
            const syntaxListNode = children.find(
              (child): child is ts.SyntaxList =>
                child.kind === ts.SyntaxKind.SyntaxList,
            );
            if (!syntaxListNode) {
              return yield* new ParserError.SyntaxListNodeNotFoundError();
            }

            return {
              fileAbsolutePath: sourceFile.fileName,
              declarations: yield* syntaxListParser.parse(syntaxListNode),
            };
          }).pipe(
            Effect.catchTags({
              UnsupportedTypeNodeError: (error) =>
                Effect.dieMessage(
                  `Unsupported type node of kind ${error.kind} found in file ${path.relative(process.cwd(), sourceFile.fileName)}`,
                ),
            }),
          ),
      };
    }),
    dependencies: [SyntaxListParser.SyntaxListParser.Default],
  },
) {}
