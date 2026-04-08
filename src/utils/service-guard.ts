import { logger } from './logger';

interface ServiceGuardConfig {
  name: string;
  maxRequests: number;
  windowMs: number;
  failureThreshold: number;
  failureWindowMs: number;
  cooldownMs: number;
}

const DEFAULT_GUARD_CONFIG = {
  maxRequests: 300,
  windowMs: 60 * 60 * 1000, // 1 hour
  failureThreshold: 5,
  failureWindowMs: 60 * 1000, // 1 minute
  cooldownMs: 30 * 1000, // 30 seconds
};

const SERVICE_OVERRIDES: Record<string, Partial<Omit<ServiceGuardConfig, 'name'>>> = {
  youTube: { maxRequests: 80 }, // YouTube Data API quota: 10k units/day, search costs 100 units
  spotify: { maxRequests: 200 }, // Unofficial API, be conservative
};

export class ServiceGuard {
  private callCount = 0;
  private windowStart = Date.now();
  private failures = 0;
  private firstFailure = 0;
  private circuitOpen = false;
  private circuitOpenedAt = 0;

  constructor(private config: ServiceGuardConfig) {}

  acquire(): boolean {
    if (this.circuitOpen) {
      if (Date.now() - this.circuitOpenedAt >= this.config.cooldownMs) {
        logger.info(`[ServiceGuard:${this.config.name}] circuit half-open, allowing probe`);
        this.circuitOpen = false;
        this.failures = 0;
      } else {
        logger.warn(`[ServiceGuard:${this.config.name}] circuit open, blocking request`);
        return false;
      }
    }

    const now = Date.now();
    if (now - this.windowStart >= this.config.windowMs) {
      this.callCount = 0;
      this.windowStart = now;
    }

    if (this.callCount >= this.config.maxRequests) {
      logger.warn(
        `[ServiceGuard:${this.config.name}] budget exhausted (${this.callCount}/${this.config.maxRequests})`
      );
      return false;
    }

    this.callCount++;
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
  }

  recordFailure(): void {
    const now = Date.now();
    if (this.failures > 0 && now - this.firstFailure > this.config.failureWindowMs) {
      this.failures = 0;
    }
    if (this.failures === 0) {
      this.firstFailure = now;
    }
    this.failures++;

    if (this.failures >= this.config.failureThreshold) {
      this.circuitOpen = true;
      this.circuitOpenedAt = now;
      logger.warn(
        `[ServiceGuard:${this.config.name}] circuit opened after ${this.failures} failures`
      );
    }
  }

  getStatus() {
    const now = Date.now();
    return {
      callsUsed: now - this.windowStart >= this.config.windowMs ? 0 : this.callCount,
      callsMax: this.config.maxRequests,
      windowResetsIn: Math.ceil(
        Math.max(0, this.config.windowMs - (now - this.windowStart)) / 1000
      ),
      circuitOpen: this.circuitOpen,
      failures: this.failures,
    };
  }
}

const guards = new Map<string, ServiceGuard>();

export function getServiceGuard(service: string): ServiceGuard {
  let guard = guards.get(service);
  if (!guard) {
    const overrides = SERVICE_OVERRIDES[service] ?? {};
    guard = new ServiceGuard({
      name: service,
      ...DEFAULT_GUARD_CONFIG,
      ...overrides,
    });
    guards.set(service, guard);
  }
  return guard;
}

export function getAllServiceGuardStatuses() {
  const statuses: Record<string, ReturnType<ServiceGuard['getStatus']>> = {};
  for (const [name, guard] of guards) {
    statuses[name] = guard.getStatus();
  }
  return statuses;
}
