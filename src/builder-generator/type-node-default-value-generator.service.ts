import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import * as Configuration from '../cli/configuration';
import type * as ProjectParser from '../lib/project-parser';
import * as ts from '../lib/typescript';
import { stringifyObjectLiteral } from './stringify-object-literal';
import * as TypeNodeDefaultValueGeneratorError from './type-node-default-value-generator.error';
import * as TypeReferenceSideEffect from './type-reference-side-effect';

const BUILTIN_TYPE_DEFAULTS: Record<ts.BuiltinOpaqueType, string> = {
  Date: 'new Date()',
  Promise: 'new Promise(() => {})',
  Map: 'new Map()',
  Set: 'new Set()',
  WeakMap: 'new WeakMap()',
  WeakSet: 'new WeakSet()',
  RegExp: 'new RegExp("")',
  Error: 'new Error()',
  BigInt: 'BigInt(0)',
  Array: '[]',
};

export class TypeNodeDefaultValueGenerator extends Effect.Service<TypeNodeDefaultValueGenerator>()(
  '@TSDataBuilders/TypeNodeDefaultValueGenerator',
  {
    effect: Effect.gen(function* () {
      const { defaults, builderJsDocTagName } =
        yield* Configuration.Configuration;

      const generateDefaultValues: (
        data: ProjectParser.TypeNode,
        opts: {
          onPropertySignature: (
            propertySignature: ProjectParser.PropertySignature,
          ) => Effect.Effect<
            Record<PropertyKey, string>,
            TypeNodeDefaultValueGeneratorError.TypeNodeDefaultValueGeneratorError,
            TypeReferenceSideEffect.TypeReferenceSideEffect
          >;
        },
      ) => Effect.Effect<
        string,
        TypeNodeDefaultValueGeneratorError.TypeNodeDefaultValueGeneratorError,
        TypeReferenceSideEffect.TypeReferenceSideEffect
      > = Effect.fnUntraced(function* (typeNode, opts) {
        return yield* Match.value(typeNode).pipe(
          Match.when({ kind: 'StringKeyword' }, () =>
            Effect.succeed(`'${defaults.string}'`),
          ),
          Match.when({ kind: 'NumberKeyword' }, () =>
            Effect.succeed(defaults.number.toString(10)),
          ),
          Match.when({ kind: 'BooleanKeyword' }, () =>
            Effect.succeed(String(defaults.boolean)),
          ),
          Match.when({ kind: 'UndefinedKeyword' }, () =>
            Effect.succeed('undefined'),
          ),
          Match.when({ kind: 'LiteralType' }, ({ literal }) =>
            Effect.succeed(literal),
          ),
          Match.when({ kind: 'BigIntKeyword' }, () => Effect.succeed('0n')),
          Match.when({ kind: 'SymbolKeyword' }, () =>
            Effect.succeed("Symbol('')"),
          ),
          Match.when({ kind: 'AnyKeyword' }, () =>
            Effect.succeed(String(ANY_DEFAULT_VALUE)),
          ),
          Match.when({ kind: 'UnknownKeyword' }, () =>
            Effect.succeed(String(UNKNOWN_DEFAULT_VALUE)),
          ),
          Match.when(
            { kind: 'NeverKeyword' },
            () =>
              new TypeNodeDefaultValueGeneratorError.CannotGeneratorDefaultValueForNeverError(),
          ),
          Match.when({ kind: 'TypeLiteral' }, ({ propertySignatures }) =>
            Effect.gen(function* () {
              const mappedSignatures = yield* Effect.all(
                propertySignatures.map((propertySignature) =>
                  opts.onPropertySignature(propertySignature),
                ),
                { concurrency: 'unbounded' },
              );

              const result: Record<PropertyKey, string> = Object.assign(
                {},
                ...mappedSignatures,
              );

              return stringifyObjectLiteral(result);
            }),
          ),
          Match.when({ kind: 'ArrayType' }, () => Effect.succeed('[]')),
          Match.when({ kind: 'TupleType' }, ({ elements }) =>
            Effect.all(
              elements.map((element) => generateDefaultValues(element, opts)),
              { concurrency: 'unbounded' },
            ).pipe(Effect.map((v) => `[${v.join(', ')}]`)),
          ),
          Match.when({ kind: 'UnionType' }, ({ members }) =>
            chooseUnionMemberToGenerate(members).pipe(
              Effect.flatMap((v) => generateDefaultValues(v, opts)),
            ),
          ),
          Match.when({ kind: 'IntersectionType' }, ({ members }) =>
            Effect.gen(function* () {
              const hasPrimitive = members.some(
                (m) => m.kind !== 'TypeLiteral' && m.kind !== 'TypeReference',
              );

              if (hasPrimitive) {
                const primitiveDefault = yield* chooseUnionMemberToGenerate(
                  members,
                ).pipe(Effect.flatMap((v) => generateDefaultValues(v, opts)));
                return `${primitiveDefault} as any`;
              }

              const memberDefaults = yield* Effect.all(
                members.map((member) => generateDefaultValues(member, opts)),
                { concurrency: 'unbounded' },
              );
              const properties = memberDefaults
                .map((obj) => obj.replace(/^\{|\}$/g, '').trim())
                .filter((prop) => prop.length > 0)
                .join(', ');
              return `{${properties}}`;
            }),
          ),
          Match.when({ kind: 'TypeReference' }, (typeReference) =>
            Effect.gen(function* () {
              const { onTypeReference } =
                yield* TypeReferenceSideEffect.TypeReferenceSideEffect;
              yield* onTypeReference(typeReference);
              if (
                typeReference.jsDocTags.some(
                  (jsDocTag) => jsDocTag.name === builderJsDocTagName,
                )
              ) {
                return `new ${typeReference.referenceName}Builder().build()`;
              }

              return yield* Option.match(typeReference.inlineType, {
                onNone: () => {
                  if (!ts.isBuiltinOpaqueType(typeReference.referenceName)) {
                    return Effect.fail(
                      new TypeNodeDefaultValueGeneratorError.MissingBuiltinTypeDefaultError(
                        { referenceName: typeReference.referenceName },
                      ),
                    );
                  }
                  return Effect.succeed(
                    BUILTIN_TYPE_DEFAULTS[typeReference.referenceName],
                  );
                },
                onSome: (type) => generateDefaultValues(type, opts),
              });
            }),
          ),

          Match.exhaustive,
        );
      });

      return {
        generate: generateDefaultValues,
      };
    }),
  },
) {}

// Record instead of array to make sure the list is exhaustive
const NODE_KIND_PRIORITY_MAP: Record<ProjectParser.TypeNode['kind'], number> = {
  UndefinedKeyword: 0,
  BooleanKeyword: 1,
  NumberKeyword: 2,
  StringKeyword: 3,
  SymbolKeyword: 4,
  BigIntKeyword: 5,
  LiteralType: 6,
  TypeLiteral: 7,
  ArrayType: 8,
  TupleType: 9,
  UnionType: 10,
  IntersectionType: 11,
  UnknownKeyword: 12,
  AnyKeyword: 13,
  TypeReference: 14,
  NeverKeyword: 15,
};

const ANY_DEFAULT_VALUE = undefined;
const UNKNOWN_DEFAULT_VALUE = undefined;

const chooseUnionMemberToGenerate = Effect.fnUntraced(function* (
  members: ProjectParser.TypeNode[],
) {
  const chosenMember = members.toSorted(
    (a, b) => NODE_KIND_PRIORITY_MAP[a.kind] - NODE_KIND_PRIORITY_MAP[b.kind],
  )[0];

  if (!chosenMember) {
    return yield* new TypeNodeDefaultValueGeneratorError.UnionMembersIsEmptyError(
      {
        memberKinds: members.map((member) => member.kind),
      },
    );
  }

  return chosenMember;
});
