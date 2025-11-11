import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import * as ts from '../../typescript/typescript';
import * as Visitor from './visitor';
import * as VisitorError from './visitor.errors';
import * as VisitorUtil from './visitor.utils';

export const PropertySignatureVisitorLayer = Layer.succeed(
  Visitor.PropertySignatureVisitor,
  Visitor.PropertySignatureVisitor.of({
    visit: Effect.fnUntraced(function* (node: ts.PropertySignature) {
      if (!node.type) {
        return yield* new VisitorError.MissingPropertySignatureTypeNodeError();
      }

      const typeNodeVisitor = yield* Visitor.TypeNodeVisitor;

      const typeNodeResult = yield* typeNodeVisitor.visit(node.type);

      if (Option.isNone(typeNodeResult)) {
        return Option.none<Visitor.PropertySignature>();
      }

      return Option.some<Visitor.PropertySignature>({
        kind: ts.SyntaxKind.PropertySignature,
        identifier: node.name.getText(),
        hasQuestionToken: Boolean(node.questionToken),
        jsDocTagsNames: yield* VisitorUtil.getJsDocTagsNames(node),
        type: typeNodeResult.value,
      });
    }),
  }),
);
