import type { TypeAliasDeclaration } from 'ts-morph';
import ts from 'typescript';

export const getTypeLiteralNodes = (typeAliases: TypeAliasDeclaration[]) => {
  return typeAliases
    .map((typeAlias) => {
      const node = typeAlias.getTypeNode();
      if (!node || !node.isKind(ts.SyntaxKind.TypeLiteral)) {
        return undefined;
      }

      return {
        name: typeAlias.getName(),
        node,
      };
    })
    .filter(Boolean);
};
