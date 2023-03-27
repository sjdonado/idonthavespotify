import server$ from 'solid-start/server';

import { getSearchCount } from '~/server/services/searchCount';

export default server$(async (): Promise<number> => {
  const searchCount = await getSearchCount();
  return searchCount;
});
