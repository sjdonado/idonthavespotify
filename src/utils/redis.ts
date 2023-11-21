import { Redis } from 'ioredis';

import * as config from '~/config/default';
import { logger } from './logger';

const redis = new Redis(config.redis.url);

redis.on('connect', () => {
  logger.info(`[redis] connected to ${config.redis.url}`);
});

export const setWithKey = async (
  key: string,
  value: string,
  expiration: number = 60 * 60 * 24
) => {
  if (expiration > 0) {
    return redis.set(key, value, 'EX', expiration);
  }

  return redis.set(key, value);
};

export const getByKey = async (key: string) => redis.get(key);
