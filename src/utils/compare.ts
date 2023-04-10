import { compareTwoStrings } from 'string-similarity';

export function compareResponseWithQuery(response: string, query: string) {
  return compareTwoStrings(response.toLowerCase(), query.toLowerCase()) < 0.3;
}
