import * as Match from 'effect/Match';
import {
  SUPPORTED_SYNTAX_KIND,
  type SupportedSyntaxKind,
} from '../parser/supported-types';

export const getDefaultValue = (kind: SupportedSyntaxKind) => {
  return Match.value(kind).pipe(
    Match.when(Match.is(SUPPORTED_SYNTAX_KIND.STRING_KEYWORD), () => ''),
    Match.exhaustive,
  );
};
