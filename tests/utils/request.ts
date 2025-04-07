import type { Server } from 'bun';

import { createApp } from '~/index';

export const nodeFetch = fetch;

let _testApp: Server;
export function createTestApp() {
  if (_testApp) return _testApp;

  _testApp = createApp();
  return _testApp;
}

export const formDataFromObject = (body: object) => {
  const formData = new FormData();

  Object.entries(body).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return formData;
};
