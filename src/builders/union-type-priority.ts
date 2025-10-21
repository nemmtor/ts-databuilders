import type { TypeNodeMetadata } from '../parser';

export const UNION_TYPE_PRIORITY: TypeNodeMetadata['kind'][] = [
  'UNDEFINED',
  'BOOLEAN',
  'NUMBER',
  'STRING',
  'DATE',
  'LITERAL',
  'TYPE_LITERAL',
  'ARRAY',
  'TUPLE',
  'RECORD',
];
