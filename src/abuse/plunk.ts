import { ENV } from '~/config/env';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

interface PlunkVerifyData {
  valid?: boolean;
  isDisposable?: boolean;
  isTypo?: boolean;
  isPlusAddressed?: boolean;
  hasMxRecords?: boolean;
  domainExists?: boolean;
  // Official field name; some mirrors document `suggestion`.
  suggestedEmail?: string;
  suggestion?: string;
}

// Plunk /v1/verify backstops disposables, MX, and typos. Fail-open on
// transport errors: OTP still costs the attacker one inbox, and a down
// verifier must not lock out legit users.
export async function verifyEmailWithPlunk(
  normalizedEmail: string
): Promise<{ ok: true; suggestion?: string } | { ok: false; error: string }> {
  const apiKey = ENV.abuse.plunkApiKey;
  if (!apiKey) return { ok: true };

  let data: PlunkVerifyData;
  try {
    const res = await HttpClient.post<{ success: boolean; data: PlunkVerifyData }>(
      `${ENV.abuse.plunkApiUrl}/v1/verify`,
      { email: normalizedEmail },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        retries: 0,
      }
    );
    data = res.data ?? {};
  } catch (err) {
    logger.warn(`[abuse] Plunk verify unreachable, allowing ${normalizedEmail}: ${err}`);
    return { ok: true };
  }

  if (data.isDisposable) return { ok: false, error: 'Disposable addresses are not accepted.' };
  if (data.isPlusAddressed) {
    return { ok: false, error: 'Plus-aliases (+) are not accepted; use your base address.' };
  }
  const hint = data.suggestedEmail ?? data.suggestion;
  if (data.valid === false || data.hasMxRecords === false || data.domainExists === false) {
    return {
      ok: false,
      error: hint
        ? `That address looks undeliverable. Did you mean ${hint}?`
        : 'That address looks undeliverable; check for typos.',
    };
  }
  if (data.isTypo && hint) {
    return { ok: false, error: `Possible typo. Did you mean ${hint}?` };
  }
  return { ok: true, suggestion: hint };
}

const RESEND_THROTTLE_MS = 60_000;
// Best-effort spam hygiene, per-isolate like the cache: isolate rotation
// can bypass it, but the DO search quota plus OTP inbox-cost stay the
// abuse backstop, so this buys quiet without a subrequest per send.
const lastSentAt = new Map<string, number>();

export function checkResendThrottle(normalizedEmail: string, nowMs: number = Date.now()) {
  const last = lastSentAt.get(normalizedEmail) ?? 0;
  const waitSec = Math.ceil((RESEND_THROTTLE_MS - (nowMs - last)) / 1000);
  return waitSec > 0 ? waitSec : 0;
}

export function markSent(normalizedEmail: string, nowMs: number = Date.now()) {
  lastSentAt.set(normalizedEmail, nowMs);
}

export function resetResendThrottle() {
  lastSentAt.clear();
}

// One-shot code delivery: template variables use non-persistent data so the
// code is never stored on the Plunk contact.
export async function sendOtpEmail(normalizedEmail: string, code: string): Promise<void> {
  const apiKey = ENV.abuse.plunkApiKey;
  if (!apiKey) throw new Error('Email gate is misconfigured (missing Plunk key).');

  const shared = {
    to: normalizedEmail,
    data: { code: { value: code, persistent: false } },
  };

  const payload = ENV.abuse.plunkTemplateId
    ? { ...shared, template: ENV.abuse.plunkTemplateId }
    : {
        ...shared,
        subject: 'Your IDHS demo code',
        body: `<p>Your verification code is <strong>${code}</strong>. It expires in about 10 minutes.</p>`,
        ...(ENV.abuse.plunkFromEmail ? { from: ENV.abuse.plunkFromEmail } : {}),
      };

  await HttpClient.post(`${ENV.abuse.plunkApiUrl}/v1/send`, payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    retries: 0,
  });
}
