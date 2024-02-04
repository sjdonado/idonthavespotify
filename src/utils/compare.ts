import { compareTwoStrings } from 'string-similarity';

import { RESPONSE_COMPARE_MIN_SCORE } from '~/config/constants';

export function responseMatchesQuery(response: string, query: string) {
  return (
    compareTwoStrings(response.toLowerCase(), query.toLowerCase()) >
    RESPONSE_COMPARE_MIN_SCORE
  );
}
