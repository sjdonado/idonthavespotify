import NodeFetchCache, { FileSystemCache } from 'node-fetch-cache';

export const nodeFetch = NodeFetchCache.create({
  cache: new FileSystemCache({
    ttl: 604800000, // 7 days
  }),
});

export const formDataFromObject = (body: object) => {
  const formData = new FormData();

  Object.entries(body).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return formData;
};
