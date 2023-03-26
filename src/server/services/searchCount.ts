import { setKey, getKey } from '~/server/utils/redis';

import { searchCountKey } from '~/config/redis';

export const incrementSearchCount = async () => {
  const count = await getKey(searchCountKey);
  await setKey(searchCountKey, String(count ? Number(count) + 1 : 1));
};

export const getSearchCount = async () => {
  const count = await getKey(searchCountKey);
  return count ? Number(count) : 0;
};
