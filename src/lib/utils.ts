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

// biome-ignore lint/complexity/noBannedTypes: need to check if it's actually a fn
export type DeepPartial<Thing> = Thing extends Function
  ? Thing
  : Thing extends Array<infer InferredArrayMember>
    ? DeepPartialArray<InferredArrayMember>
    : Thing extends object
      ? DeepPartialObject<Thing>
      : Thing | undefined;

interface DeepPartialArray<Thing> extends Array<DeepPartial<Thing>> {}

type DeepPartialObject<Thing> = {
  [Key in keyof Thing]?: DeepPartial<Thing[Key]>;
};
