import type { TypeAliasDeclaration } from 'ts-morph';

export const getJsDocTags = (typeAlias: TypeAliasDeclaration) => {
  return typeAlias.getJsDocs().flatMap((jsDoc) =>
    jsDoc.getTags().flatMap((tag) =>
      tag
        .getText()
        .split('\n')
        .map((v) => v.trim())
        .filter((v) => v !== '*' && v !== ''),
    ),
  );
};
