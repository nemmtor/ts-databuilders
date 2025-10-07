import { SyntaxKind } from 'ts-morph';

export const SUPPORTED_SYNTAX_KIND = {
  STRING_KEYWORD: SyntaxKind.StringKeyword,
} as const;

export const SUPPORTED_SYNTAX_KINDS = Object.values(SUPPORTED_SYNTAX_KIND);
export type SupportedSyntaxKind = (typeof SUPPORTED_SYNTAX_KINDS)[number];

export const isSupportedSyntaxKind = (
  syntaxKind: SyntaxKind,
): syntaxKind is SupportedSyntaxKind => {
  return SUPPORTED_SYNTAX_KINDS.includes(syntaxKind);
};
