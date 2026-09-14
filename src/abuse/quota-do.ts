import {
  checkQuota,
  peekQuota,
  QUOTA_COOLDOWN_SEC,
  QUOTA_WINDOW_SEC,
  type QuotaState,
} from './quota';

// Minimal structural types: no workers-types dependency, both tsconfigs pass.
interface DOStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  list?: (options?: { prefix?: string }) => Promise<Map<string, unknown>>;
  setAlarm?: (scheduledTime: number | Date) => Promise<void>;
}

interface DOState {
  storage: DOStorage;
}

// Edge source of truth for per-email quota. One subrequest per search;
// rows hold only window counters keyed by email hash.
export class QuotaDO {
  constructor(private state: DOState) {}

  async fetch(req: Request): Promise<Response> {
    let body: { action?: string; emailHash?: string };
    try {
      body = (await req.json()) as { action?: string; emailHash?: string };
    } catch {
      return Response.json({ ok: false, error: 'Bad request' }, { status: 400 });
    }
    if (!body.emailHash || !/^[0-9a-f]{64}$/.test(body.emailHash)) {
      return Response.json({ ok: false, error: 'Bad request' }, { status: 400 });
    }

    const key = `q:${body.emailHash}`;
    const stored = await this.state.storage.get<QuotaState>(key);

    if (body.action === 'peek') {
      return Response.json({ ok: true, verdict: peekQuota(stored) });
    }
    if (body.action !== 'check') {
      return Response.json({ ok: false, error: 'Bad request' }, { status: 400 });
    }

    const { verdict, state } = checkQuota(stored);
    await this.state.storage.put(key, state);
    // Auto-expire windows; reads prune lazily even if alarms never fire.
    try {
      await this.state.storage.setAlarm?.(
        Date.now() + (QUOTA_WINDOW_SEC + QUOTA_COOLDOWN_SEC) * 1000
      );
    } catch {
      // Alarm scheduling is best-effort.
    }
    return Response.json({ ok: true, verdict });
  }

  async alarm(): Promise<void> {
    const list = this.state.storage.list;
    if (!list) return;
    const entries = await list({ prefix: 'q:' });
    const now = Date.now();
    const windowStart = now - QUOTA_WINDOW_SEC * 1000;
    for (const [key, value] of entries) {
      const state = value as QuotaState | undefined;
      const timestamps = (state?.timestamps ?? []).filter(t => t > windowStart);
      const blocked = state?.blockedUntil && now < state.blockedUntil;
      if (!blocked && timestamps.length === 0) {
        await this.state.storage.delete(key);
      } else if (timestamps.length !== (state?.timestamps ?? []).length) {
        await this.state.storage.put(key, { timestamps, blockedUntil: state?.blockedUntil });
      }
    }
  }
}
