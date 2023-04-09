import { compareTwoStrings } from 'string-similarity';

export function compareResponseWithQuery(response: string, query: string) {
  return compareTwoStrings(response.toLowerCase(), query) < 0.4;
}
