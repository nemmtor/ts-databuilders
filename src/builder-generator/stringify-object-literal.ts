export const stringifyObjectLiteral = (
  obj: Record<PropertyKey, string>,
): string => {
  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';

  const props = entries.map(([key, value]) => {
    const strippedKey = key.replace(/^['"](.*)['"]$/, '$1');
    return `'${strippedKey}':${value}`;
  });

  return `{${props.join(',')}}`;
};
