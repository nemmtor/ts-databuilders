export const isDefined = <T>(value: T): value is Exclude<T, undefined> => {
  return value !== undefined;
};

export const removeUndefinedFields = <T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T]: Exclude<T[K], undefined> } => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => isDefined(v)),
  ) as { [K in keyof T]: Exclude<T[K], undefined> };
};
