import { createApp } from '~/index';

export const nodeFetch = fetch;

export function createTestApp() {
  return createApp();
}

export const formDataFromObject = (body: object) => {
  const formData = new FormData();

  Object.entries(body).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return formData;
};
