import { sha256Hex } from './crypto';

// Per-email quota: 6 searches per rolling 4 min; past it, 429 plus a 2-min
// cooldown. Rows are keyed by email hash and hold only window counters.
export const QUOTA_LIMIT = 6;
export const QUOTA_WINDOW_SEC = 4 * 60;
export const QUOTA_COOLDOWN_SEC = 2 * 60;

export interface QuotaState {
  timestamps: number[];
  blockedUntil?: number;
}

export interface QuotaVerdict {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
  resetInSec: number;
}

export const hashEmail = (normalizedEmail: string): Promise<string> =>
  sha256Hex(`quota:${normalizedEmail}`);

export function checkQuota(
  state: QuotaState | undefined,
  nowMs: number = Date.now()
): { verdict: QuotaVerdict; state: QuotaState } {
  const windowStart = nowMs - QUOTA_WINDOW_SEC * 1000;
  const timestamps = (state?.timestamps ?? []).filter(t => t > windowStart);

  if (state?.blockedUntil && nowMs < state.blockedUntil) {
    const retryAfterSec = Math.ceil((state.blockedUntil - nowMs) / 1000);
    return {
      verdict: { allowed: false, retryAfterSec, remaining: 0, resetInSec: retryAfterSec },
      state: { timestamps, blockedUntil: state.blockedUntil },
    };
  }

  if (timestamps.length >= QUOTA_LIMIT) {
    const blockedUntil = nowMs + QUOTA_COOLDOWN_SEC * 1000;
    return {
      verdict: {
        allowed: false,
        retryAfterSec: QUOTA_COOLDOWN_SEC,
        remaining: 0,
        resetInSec: QUOTA_COOLDOWN_SEC,
      },
      state: { timestamps, blockedUntil },
    };
  }

  const next: QuotaState = { timestamps: [...timestamps, nowMs] };
  const oldest = next.timestamps[0];
  return {
    verdict: {
      allowed: true,
      retryAfterSec: 0,
      remaining: QUOTA_LIMIT - next.timestamps.length,
      resetInSec: Math.ceil((oldest + QUOTA_WINDOW_SEC * 1000 - nowMs) / 1000),
    },
    state: next,
  };
}

export function peekQuota(
  state: QuotaState | undefined,
  nowMs: number = Date.now()
): QuotaVerdict {
  const windowStart = nowMs - QUOTA_WINDOW_SEC * 1000;
  const timestamps = (state?.timestamps ?? []).filter(t => t > windowStart);
  if (state?.blockedUntil && nowMs < state.blockedUntil) {
    const retryAfterSec = Math.ceil((state.blockedUntil - nowMs) / 1000);
    return { allowed: false, retryAfterSec, remaining: 0, resetInSec: retryAfterSec };
  }
  if (timestamps.length >= QUOTA_LIMIT) {
    return { allowed: false, retryAfterSec: QUOTA_COOLDOWN_SEC, remaining: 0, resetInSec: QUOTA_COOLDOWN_SEC };
  }
  const oldest = timestamps[0];
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: QUOTA_LIMIT - timestamps.length,
    resetInSec: oldest ? Math.ceil((oldest + QUOTA_WINDOW_SEC * 1000 - nowMs) / 1000) : 0,
  };
}

// Self-host (and edge without a DO binding) fallback: same windows,
// process-local memory. The DO below is the edge source of truth.
const localStates = new Map<string, QuotaState>();

export function checkLocalQuota(emailHash: string, nowMs: number = Date.now()) {
  const { verdict, state } = checkQuota(localStates.get(emailHash), nowMs);
  localStates.set(emailHash, state);
  return verdict;
}

export function peekLocalQuota(emailHash: string, nowMs: number = Date.now()) {
  return peekQuota(localStates.get(emailHash), nowMs);
}

export function resetLocalQuota() {
  localStates.clear();
}
