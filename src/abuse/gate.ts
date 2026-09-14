import { getEdgeBinding } from '~/config/edge-env';
import { ENV } from '~/config/env';
import { logger } from '~/utils/logger';

import { hashEmail, peekLocalQuota, type QuotaVerdict } from './quota';
import { checkLocalQuota } from './quota';
import { readBearerToken, readSessionCookie, verifySessionToken } from './session';

interface QuotaStub {
  fetch(input: Request): Promise<Response>;
}

interface QuotaNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): QuotaStub;
}

export const isGateEnabled = (): boolean => ENV.abuse.gateEnabled === true;

const sessionSecret = (): string | undefined => ENV.abuse.sessionSecret;

export async function getVerifiedEmail(req: Request): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  // A present-but-invalid bearer must not suppress a valid cookie.
  const bearer = readBearerToken(req);
  if (bearer) {
    const email = await verifySessionToken(bearer, secret);
    if (email) return email;
  }
  const cookie = readSessionCookie(req);
  if (!cookie) return null;
  return verifySessionToken(cookie, secret);
}

export const emailHashFor = (normalizedEmail: string): Promise<string> =>
  hashEmail(normalizedEmail);

async function queryQuotaDO(
  emailHash: string,
  action: 'check' | 'peek'
): Promise<QuotaVerdict | null> {
  const ns = getEdgeBinding<QuotaNamespace>('QUOTA_DO');
  if (!ns) return null;
  try {
    const stub = ns.get(ns.idFromName(emailHash));
    const res = await stub.fetch(
      new Request('https://quota/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, emailHash }),
      })
    );
    if (!res.ok) throw new Error(`DO HTTP ${res.status}`);
    const data = (await res.json()) as { ok: boolean; verdict?: QuotaVerdict };
    if (!data.ok || !data.verdict) throw new Error('DO bad payload');
    return data.verdict;
  } catch (err) {
    logger.error(`[abuse] quota DO unreachable, failing closed: ${err}`);
    return null;
  }
}

// Identity only (401). Null when the gate is disabled (open access).
// Split from quota so handlers validate input before burning quota.
export async function requireGateIdentity(
  req: Request,
  json: boolean
): Promise<string | Response | null> {
  if (!isGateEnabled()) return null;
  if (!sessionSecret()) return gateMisconfiguredResponse();
  const email = await getVerifiedEmail(req);
  if (!email) return unauthenticatedResponse(json);
  return email;
}

// Quota only (429/503). Call after input validation: bad input burns nothing.
export async function checkSearchQuota(
  normalizedEmail: string
): Promise<Response | null> {
  const quota = await consumeQuota(normalizedEmail);
  if ('doError' in quota) return quotaUnavailableResponse();
  if (!quota.verdict.allowed) return quotaExceededResponse(quota.verdict);
  return null;
}

// Fail-closed: a null verdict means the DO errored — the caller must deny.
export async function consumeQuota(
  normalizedEmail: string
): Promise<{ verdict: QuotaVerdict } | { doError: true }> {
  const emailHash = await emailHashFor(normalizedEmail);
  const ns = getEdgeBinding<QuotaNamespace>('QUOTA_DO');
  if (ns) {
    const verdict = await queryQuotaDO(emailHash, 'check');
    return verdict ? { verdict } : { doError: true };
  }
  // Self-host runs on Bun with no binding: same windows, process-local.
  // Edge without a binding is misconfiguration: fail closed, not per-isolate.
  if (typeof Bun === 'undefined') {
    logger.error('[abuse] quota DO binding missing on edge, failing closed');
    return { doError: true };
  }
  return { verdict: checkLocalQuota(emailHash) };
}

export async function peekQuotaFor(
  normalizedEmail: string
): Promise<QuotaVerdict | null> {
  const emailHash = await emailHashFor(normalizedEmail);
  const ns = getEdgeBinding<QuotaNamespace>('QUOTA_DO');
  if (ns) return queryQuotaDO(emailHash, 'peek');
  if (typeof Bun === 'undefined') return null;
  return peekLocalQuota(emailHash);
}

export const wantsJson = (req: Request): boolean =>
  req.headers.get('accept')?.includes('application/json') === true ||
  req.headers.get('content-type')?.includes('application/json') === true;

export const unauthenticatedResponse = (json: boolean): Response =>
  json
    ? Response.json(
        { error: 'Verify your email to use this demo.', auth: 'email-otp' },
        { status: 401 }
      )
    : Response.json(
        { message: 'Verify your email to use this demo.', auth: 'email-otp' },
        { status: 401 }
      );

export const quotaExceededResponse = (verdict: QuotaVerdict): Response =>
  Response.json(
    {
      error: `Demo quota reached. Try again in ${verdict.retryAfterSec}s.`,
      retryAfter: verdict.retryAfterSec,
    },
    {
      status: 429,
      headers: { 'Retry-After': String(verdict.retryAfterSec) },
    }
  );

export const quotaUnavailableResponse = (): Response =>
  Response.json(
    { error: 'Quota check unavailable, try again shortly.' },
    { status: 503 }
  );

export const gateMisconfiguredResponse = (): Response =>
  Response.json({ error: 'Demo gate is misconfigured, try again later.' }, { status: 503 });
