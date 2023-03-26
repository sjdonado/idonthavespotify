import { Redis } from 'ioredis';

const { VITE_REDIS_URL } = import.meta.env;

const redis = new Redis(VITE_REDIS_URL);

export const setKey = async (key: string, value: string) => {
  await redis.set(key, value);
};

export const getKey = async (key: string) => redis.get(key);
