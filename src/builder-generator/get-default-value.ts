import * as Match from 'effect/Match';
import type { TypePropertyShape } from '../parser/build-node-shape';
import { PROPERTY_TYPE } from '../parser/supported-types';

export const getDefaultValueLiteral = (
  typePropertyShape: TypePropertyShape,
) => {
  return Match.value(typePropertyShape).pipe(
    Match.withReturnType<string>(),
    Match.when({ kind: PROPERTY_TYPE.STRING }, () => '""'),
    Match.when({ kind: PROPERTY_TYPE.NUMBER }, () => '0'),
    Match.when({ kind: PROPERTY_TYPE.BOOLEAN }, () => 'false'),
    Match.when({ kind: PROPERTY_TYPE.UNDEFINED }, () => 'undefined'),
    Match.when({ kind: PROPERTY_TYPE.NULL }, () => 'null'),
    Match.when({ kind: PROPERTY_TYPE.DATE }, () => 'new Date()'),
    Match.exhaustive,
  );
};
