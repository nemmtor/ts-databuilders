import { SyntaxKind, type TypeAliasDeclaration } from 'ts-morph';

export const getTypeLiteralNodes = (typeAliases: TypeAliasDeclaration[]) => {
  return typeAliases
    .map((typeAlias) => {
      const node = typeAlias.getTypeNode();
      if (!node || !node.isKind(SyntaxKind.TypeLiteral)) {
        return undefined;
      }

      return {
        name: typeAlias.getName(),
        node,
      };
    })
    .filter(Boolean);
};
