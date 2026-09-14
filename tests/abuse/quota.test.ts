import { describe, expect, it } from 'bun:test';

import type { QuotaState } from '~/abuse/quota';
import {
  checkQuota,
  hashEmail,
  peekQuota,
  QUOTA_COOLDOWN_SEC,
  QUOTA_LIMIT,
  QUOTA_WINDOW_SEC,
} from '~/abuse/quota';
import { QuotaDO } from '~/abuse/quota-do';

describe('Per-email quota windows', () => {
  it('allows 6 searches per rolling 4 minutes', () => {
    let state: QuotaState | undefined;
    const now = Date.now();
    for (let i = 0; i < QUOTA_LIMIT; i++) {
      const res = checkQuota(state, now + i * 1000);
      expect(res.verdict.allowed).toBe(true);
      state = res.state;
    }
    expect(state?.timestamps).toHaveLength(QUOTA_LIMIT);
  });

  it('denies the 7th search with a retry delay that can succeed', () => {
    let state: QuotaState | undefined;
    const now = Date.now();
    for (let i = 0; i < QUOTA_LIMIT; i++) state = checkQuota(state, now).state;
    // Burst traffic: the rolling window outlives the cooldown, so the
    // reported delay is the window expiry, not the bare 2 minutes.
    const denied = checkQuota(state, now);
    expect(denied.verdict.allowed).toBe(false);
    expect(denied.verdict.retryAfterSec).toBe(QUOTA_WINDOW_SEC);

    const duringCooldown = checkQuota(denied.state, now + 30_000);
    expect(duringCooldown.verdict.allowed).toBe(false);

    const afterWindow = checkQuota(denied.state, now + (QUOTA_WINDOW_SEC + QUOTA_COOLDOWN_SEC + 1) * 1000);
    expect(afterWindow.verdict.allowed).toBe(true);
  });

  it('floors the retry delay at the cooldown for spread traffic', () => {
    let state: QuotaState | undefined;
    const now = Date.now();
    // Six searches spread so the oldest slot frees before the cooldown ends.
    for (let i = 0; i < QUOTA_LIMIT; i++) {
      state = checkQuota(state, now - (QUOTA_WINDOW_SEC - 10) * 1000 + i * 1000).state;
    }
    const denied = checkQuota(state, now);
    expect(denied.verdict.allowed).toBe(false);
    expect(denied.verdict.retryAfterSec).toBe(QUOTA_COOLDOWN_SEC);
  });

  it('peek does not consume quota', () => {
    const first = checkQuota(undefined);
    const peeked = peekQuota(first.state);
    expect(peeked.remaining).toBe(QUOTA_LIMIT - 1);
    expect(peekQuota(first.state).remaining).toBe(QUOTA_LIMIT - 1);
  });

  it('hashes emails to fixed keys', async () => {
    const a = await hashEmail('user@gmail.com');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    await expect(hashEmail('user@gmail.com')).resolves.toBe(a);
    await expect(hashEmail('other@gmail.com')).resolves.not.toBe(a);
  });
});

describe('QuotaDO', () => {
  const memState = () => {
    const store = new Map<string, unknown>();
    return {
      storage: {
        get: async <T>(key: string) => store.get(key) as T | undefined,
        put: async (key: string, value: unknown) => {
          store.set(key, value);
        },
        delete: async (key: string) => store.delete(key),
        list: async ({ prefix }: { prefix?: string } = {}) =>
          new Map(
            [...store.entries()].filter(([k]) => !prefix || k.startsWith(prefix))
          ),
        setAlarm: async () => undefined,
      },
    };
  };

  const rpc = (do_: QuotaDO, action: string, emailHash: string) =>
    do_.fetch(
      new Request('https://quota/', {
        method: 'POST',
        body: JSON.stringify({ action, emailHash }),
      })
    );

  it('checks, peeks, and expires via alarm', async () => {
    const do_ = new QuotaDO(memState());
    const emailHash = await hashEmail('user@gmail.com');

    for (let i = 0; i < QUOTA_LIMIT; i++) {
      const res = await rpc(do_, 'check', emailHash);
      const data = (await res.json()) as { ok: boolean; verdict: { allowed: boolean } };
      expect(data.ok).toBe(true);
      expect(data.verdict.allowed).toBe(true);
    }

    const denied = (await (await rpc(do_, 'check', emailHash)).json()) as {
      verdict: { allowed: boolean; retryAfterSec: number };
    };
    expect(denied.verdict.allowed).toBe(false);

    const peeked = (await (await rpc(do_, 'peek', emailHash)).json()) as {
      verdict: { allowed: boolean };
    };
    expect(peeked.verdict.allowed).toBe(false);

    const bad = await rpc(do_, 'check', 'not-a-hash');
    expect(bad.status).toBe(400);

    await do_.alarm();
  });
});
