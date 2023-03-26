import { setKey, getKey } from '~/utils/redis';

const SEARCH_COUNT_KEY = 'searchCount';

export const incrementSearchCount = async () => {
  const count = await getKey(SEARCH_COUNT_KEY);
  await setKey(SEARCH_COUNT_KEY, String(count ? Number(count) + 1 : 1));
};

export const getSearchCount = async () => {
  const count = await getKey(SEARCH_COUNT_KEY);
  return count ? Number(count) : 0;
};
