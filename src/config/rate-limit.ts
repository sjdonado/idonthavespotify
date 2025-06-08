import { RateLimiter } from '~/utils/rate-limit-middleware';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  cleanupIntervalMs?: number;
}

const config = {
  // for development or low-traffic scenarios
  permissive: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
  },
  web: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  assets: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
  },
} as const;

const developmentConfig = {
  web: config.permissive,
  api: config.permissive,
};

const productionConfig = {
  web: config.web,
  api: config.api,
};

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const rateLimitConfig = isTest
  ? developmentConfig // Use permissive limits for testing
  : isDevelopment
    ? developmentConfig
    : productionConfig;

export const createWebRateLimiter = () => new RateLimiter(rateLimitConfig.web);
export const createAPIRateLimiter = () => new RateLimiter(rateLimitConfig.api);

export const rateLimitMessages = {
  web: 'Too many requests. Please wait before trying again.',
  api: 'API rate limit exceeded. Please wait before making more requests.',
  default: 'Rate limit exceeded. Please try again later.',
} as const;

export const getRateLimitMessage = (type: keyof typeof rateLimitMessages): string => {
  return rateLimitMessages[type] || rateLimitMessages.default;
};
