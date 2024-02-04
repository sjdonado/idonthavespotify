import { compareTwoStrings } from 'string-similarity';

export function responseMatchesQuery(response: string, query: string) {
  return compareTwoStrings(response.toLowerCase(), query.toLowerCase()) > 0.4;
}
