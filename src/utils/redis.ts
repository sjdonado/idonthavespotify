import { Redis } from 'ioredis';

import * as config from '~/config/default';
import { logger } from './logger';

const redis = new Redis(config.redis.url);

redis.on('connect', () => {
  logger.info(`[redis] connected to ${config.redis.url}`);
});

export const setWithKey = async (key: string, value: string, expire?: boolean) => {
  if (expire) {
    return redis.set(key, value, 'EX', 60 * 60 * 24);
  }

  return redis.set(key, value);
};

export const getByKey = async (key: string) => redis.get(key);
