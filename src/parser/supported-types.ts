export type PropertyType =
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE'
  | 'UNDEFINED'
  | 'NULL';

export const PROPERTY_TYPE: { [key in PropertyType]: key } = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  DATE: 'DATE',
  UNDEFINED: 'UNDEFINED',
  NULL: 'NULL',
};
