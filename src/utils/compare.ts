import { compareTwoStrings } from 'string-similarity';

export function compareResponseWithQuery(response: string, query: string) {
  const decodedQuery = decodeURIComponent(query).toLowerCase();

  return compareTwoStrings(response.toLowerCase(), decodedQuery) < 0.4;
}
