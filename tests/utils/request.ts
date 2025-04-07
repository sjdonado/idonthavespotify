import type { Server } from 'bun';
import NodeFetchCache, { FileSystemCache } from 'node-fetch-cache';

import { createApp } from '~/index';

export const nodeFetch = NodeFetchCache.create({
  cache: new FileSystemCache({
    ttl: 15 * 60 * 1000, // 15 mins
  }),
});

export const formDataFromObject = (body: object) => {
  const formData = new FormData();

  Object.entries(body).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return formData;
};

let _testApp: Server;
export function createTestApp() {
  if (_testApp) return _testApp;

  _testApp = createApp();
  return _testApp;
}
