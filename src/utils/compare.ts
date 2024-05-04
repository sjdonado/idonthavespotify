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

  const resultWithBestScore = {
    href: '',
    score: 0,
  };

  listElements.each((_, el) => {
    const title = doc(el).text().trim();
    const href = doc(el).attr('href');
    const score = compareTwoStrings(title.toLowerCase(), parsedQuery);

    if (href && score > resultWithBestScore.score) {
      resultWithBestScore.href = href;
      resultWithBestScore.score = score;
    }
  });

  return resultWithBestScore;
}
