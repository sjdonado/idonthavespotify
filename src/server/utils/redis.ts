import { Redis } from 'ioredis';

import * as ENV from '~/config/env/server';

const redis = new Redis(ENV.redis.url);

export const setKey = async (key: string, value: string) => {
  await redis.set(key, value);
};

export const getKey = async (key: string) => redis.get(key);
