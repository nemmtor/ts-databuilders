import { isDefined } from './is-defined';

export const removeUndefinedFields = <T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T]: Exclude<T[K], undefined> } => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => isDefined(v)),
  ) as { [K in keyof T]: Exclude<T[K], undefined> };
};
