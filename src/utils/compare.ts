import type { Cheerio, CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
import { compareTwoStrings } from 'string-similarity';

import {
  RESPONSE_COMPARE_MIN_INCLUSION_SCORE,
  RESPONSE_COMPARE_MIN_SCORE,
} from '~/config/constants';
import type { Adapter } from '~/config/enum';
import type { SearchResultLink } from '~/services/search';

import { cleanSearchQuery } from './query';

export interface MatchCandidate {
  title: string;
  artist?: string;
  url: string;
}

export function scoreMatch(candidateText: string, query: string): number {
  const normalizedCandidate = cleanSearchQuery(candidateText).toLowerCase();
  const normalizedQuery = cleanSearchQuery(query).toLowerCase();
  return compareTwoStrings(normalizedCandidate, normalizedQuery);
}

export function findBestMatch(
  candidates: MatchCandidate[],
  query: string,
  adapter: Adapter
): { bestMatch: SearchResultLink | null; highestScore: number; matchedIndex: number } {
  let bestMatch: SearchResultLink | null = null;
  let highestScore = 0;
  let matchedIndex = -1;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const candidateText = [candidate.title, candidate.artist]
      .filter(Boolean)
      .join(' ');
    const score = scoreMatch(candidateText, query);

    if (score > highestScore) {
      highestScore = score;
      matchedIndex = i;
      bestMatch = {
        type: adapter,
        url: candidate.url,
        isVerified: score >= RESPONSE_COMPARE_MIN_SCORE,
        notAvailable: score < RESPONSE_COMPARE_MIN_INCLUSION_SCORE,
      };
    }
  }

  return { bestMatch, highestScore, matchedIndex };
}

export function getResultWithBestScore(
  doc: CheerioAPI,
  listElements: Cheerio<AnyNode>,
  query: string
) {
  const resultWithBestScore = {
    href: '',
    score: 0,
  };

  listElements.each((_, el) => {
    const title = doc(el).text().trim();
    const href = doc(el).attr('href');
    const score = scoreMatch(title, query);

    if (href && score > resultWithBestScore.score) {
      resultWithBestScore.href = href;
      resultWithBestScore.score = score;
    }
  });

  if (resultWithBestScore.href === '') {
    throw new Error(`Result with best score not found for: ${query}`);
  }

  return resultWithBestScore;
}
