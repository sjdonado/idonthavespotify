import type { AnyNode, Cheerio, CheerioAPI } from 'cheerio';
import { compareTwoStrings } from 'string-similarity';

import { RESPONSE_COMPARE_MIN_SCORE } from '~/config/constants';

export function responseMatchesQuery(response: string, query: string) {
  return (
    compareTwoStrings(response.toLowerCase(), query.toLowerCase()) >
    RESPONSE_COMPARE_MIN_SCORE
  );
}

export function getResultWithBestScore(
  doc: CheerioAPI,
  listElements: Cheerio<AnyNode>,
  query: string
) {
  const parsedQuery = query.toLowerCase().trim();

  const bestScore = {
    href: '',
    score: 0,
  };

  listElements.each((i, el) => {
    const title = doc(el).text().trim();
    const href = doc(el).attr('href');
    const score = compareTwoStrings(title.toLowerCase(), parsedQuery);

    if (href && score > bestScore.score) {
      bestScore.href = href;
      bestScore.score = score;
    }
  });

  if (bestScore.score <= RESPONSE_COMPARE_MIN_SCORE) {
    throw new Error(`No results found: ${JSON.stringify(bestScore)}`);
  }

  return bestScore;
}
