import { logger } from './logger';

export interface RateLimitMiddlewareOptions {
  rateLimiter: RateLimiter;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  statusCode?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  resetTime: number;
}

type RequestHandler = (req: Request) => Response | Promise<Response>;

export function withRateLimit(
  handler: RequestHandler,
  options: RateLimitMiddlewareOptions
): RequestHandler {
  const {
    rateLimiter,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
  } = options;

  return async (req: Request) => {
    const ip = getClientIP(req);

    if (!rateLimiter.isAllowed(ip)) {
      const resetTime = rateLimiter.getTimeToReset(ip);
      const resetDate = new Date(Date.now() + resetTime);

      logger.warn(`Rate limit exceeded for IP: ${ip}`);

      return new Response(
        JSON.stringify({
          error: message,
          retryAfter: Math.ceil(resetTime / 1000),
        }),
        {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(resetTime / 1000).toString(),
            'X-RateLimit-Limit': rateLimiter['maxRequests'].toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetDate.toISOString(),
          },
        }
      );
    }

    try {
      // Execute the original handler
      const response = await handler(req);

      // Skip counting if configured to do so
      if (skipSuccessfulRequests && response.status < 400) {
        return response;
      }

      if (skipFailedRequests && response.status >= 400) {
        return response;
      }

      // Add rate limit headers to successful responses
      const remaining = rateLimiter['maxRequests'] - rateLimiter.getRequestCount(ip);
      const resetTime = rateLimiter.getTimeToReset(ip);
      const resetDate = new Date(Date.now() + resetTime);

      // Clone the response to add headers
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      newResponse.headers.set('X-RateLimit-Limit', rateLimiter['maxRequests'].toString());
      newResponse.headers.set('X-RateLimit-Remaining', Math.max(0, remaining).toString());
      newResponse.headers.set('X-RateLimit-Reset', resetDate.toISOString());

      return newResponse;
    } catch (error) {
      // Log the error and re-throw
      logger.error(`Error in rate-limited handler for IP ${ip}:`, error);
      throw error;
    }
  };
}

export function withRateLimitHTML(
  handler: RequestHandler,
  options: Omit<RateLimitMiddlewareOptions, 'message'> & {
    message?: string;
    htmlMessage?: string;
  }
): RequestHandler {
  const {
    rateLimiter,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later.',
    htmlMessage,
    statusCode = 429,
  } = options;

  return async (req: Request) => {
    const ip = getClientIP(req);

    // Check if rate limited
    if (!rateLimiter.isAllowed(ip)) {
      const resetTime = rateLimiter.getTimeToReset(ip);
      const resetDate = new Date(Date.now() + resetTime);

      logger.warn(`Rate limit exceeded for IP: ${ip}`);

      // Determine if this is an HTML or JSON request
      const acceptHeader = req.headers.get('accept') || '';
      const isHtmlRequest = acceptHeader.includes('text/html');

      if (isHtmlRequest && htmlMessage) {
        return new Response(htmlMessage, {
          status: statusCode,
          headers: {
            'Content-Type': 'text/html',
            'Retry-After': Math.ceil(resetTime / 1000).toString(),
            'X-RateLimit-Limit': rateLimiter['maxRequests'].toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetDate.toISOString(),
          },
        });
      }

      // Fallback to JSON response
      return new Response(
        JSON.stringify({
          error: message,
          retryAfter: Math.ceil(resetTime / 1000),
        }),
        {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(resetTime / 1000).toString(),
            'X-RateLimit-Limit': rateLimiter['maxRequests'].toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetDate.toISOString(),
          },
        }
      );
    }

    try {
      // Execute the original handler
      const response = await handler(req);

      // Skip counting if configured to do so
      if (skipSuccessfulRequests && response.status < 400) {
        return response;
      }

      if (skipFailedRequests && response.status >= 400) {
        return response;
      }

      return response;
    } catch (error) {
      logger.error(`Error in rate-limited handler for IP ${ip}:`, error);
      throw error;
    }
  };
}

export function checkRateLimit(
  req: Request,
  rateLimiter: RateLimiter
): {
  allowed: boolean;
  ip: string;
  resetTime: number;
  remaining: number;
} {
  const ip = getClientIP(req);
  const allowed = rateLimiter.isAllowed(ip);
  const resetTime = rateLimiter.getTimeToReset(ip);
  const remaining = rateLimiter['maxRequests'] - rateLimiter.getRequestCount(ip);

  return {
    allowed,
    ip,
    resetTime,
    remaining: Math.max(0, remaining),
  };
}

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

interface RateLimiterOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  cleanupIntervalMs?: number; // How often to clean up expired entries
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private maxRequests: number;
  private cleanupInterval?: Timer;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;

    // Set up automatic cleanup every 5 minutes by default
    const cleanupIntervalMs = options.cleanupIntervalMs ?? 5 * 60 * 1000;
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  /**
   * Check if an IP address should be rate limited
   * @param ip IP address to check
   * @returns true if request should be allowed, false if rate limited
   */
  isAllowed(ip: string): boolean {
    const now = Date.now();
    const entry = this.store.get(ip);

    if (!entry) {
      // First request from this IP
      this.store.set(ip, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
      });
      return true;
    }

    // Check if the window has expired
    if (now - entry.firstRequest > this.windowMs) {
      // Reset the window
      this.store.set(ip, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
      });
      return true;
    }

    // Within the same window, increment count
    entry.count++;
    entry.lastRequest = now;

    // Check if limit exceeded
    return entry.count <= this.maxRequests;
  }

  /**
   * Get current request count for an IP
   */
  getRequestCount(ip: string): number {
    const entry = this.store.get(ip);
    if (!entry) return 0;

    const now = Date.now();
    if (now - entry.firstRequest > this.windowMs) {
      return 0; // Window expired
    }

    return entry.count;
  }

  /**
   * Get time until rate limit resets for an IP (in milliseconds)
   */
  getTimeToReset(ip: string): number {
    const entry = this.store.get(ip);
    if (!entry) return 0;

    const now = Date.now();
    const timeElapsed = now - entry.firstRequest;

    if (timeElapsed > this.windowMs) {
      return 0; // Already reset
    }

    return this.windowMs - timeElapsed;
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredIPs: string[] = [];

    for (const [ip, entry] of this.store.entries()) {
      if (now - entry.lastRequest > this.windowMs * 2) {
        // Clean up entries that haven't been accessed for 2x the window time
        expiredIPs.push(ip);
      }
    }

    expiredIPs.forEach(ip => this.store.delete(ip));

    if (expiredIPs.length > 0) {
      console.log(`Rate limiter cleaned up ${expiredIPs.length} expired entries`);
    }
  }

  /**
   * Get current store size (for monitoring)
   */
  getStoreSize(): number {
    return this.store.size;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Destroy the rate limiter and clear cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Helper function to extract IP from request
export function getClientIP(req: Request): string {
  // Check common headers for real IP (in case of proxies/load balancers)
  const headers = req.headers;

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  const clientIP = headers.get('x-client-ip');
  if (clientIP) {
    return clientIP.trim();
  }

  // Fallback to a default IP if we can't determine it
  // In a real deployment behind a proxy, this should be configured properly
  return '127.0.0.1';
}
