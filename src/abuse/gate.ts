import { getEdgeBinding } from '~/config/edge-env';
import { ENV } from '~/config/env';
import { logger } from '~/utils/logger';

import { hashEmail, peekLocalQuota, type QuotaVerdict } from './quota';
import { checkLocalQuota } from './quota';
import { readSessionCookie, verifySessionToken } from './session';

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
  // Cookie only: no bearer scheme exists, so only the first-party frontend
  // (which holds the login cookie) authenticates on the public instance.
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
  if (!sessionSecret()) return gateMisconfiguredResponse(json);
  const email = await getVerifiedEmail(req);
  if (!email) return unauthenticatedResponse(json);
  return email;
}

// Quota only (429/503). Call after input validation: bad input burns nothing.
export async function checkSearchQuota(
  normalizedEmail: string,
  json: boolean
): Promise<Response | null> {
  const quota = await consumeQuota(normalizedEmail);
  if ('doError' in quota) return quotaUnavailableResponse(json);
  if (!quota.verdict.allowed)
    return quotaExceededResponse(quota.verdict, json);
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

export const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Web-flow error fragment: htmx 4 swaps 4xx/5xx bodies into the target, so
// web errors must be HTML, never JSON. Same centered style as ErrorMessage.
const webErrorFragment = (message: string): string =>
  `<p class="mt-8 text-center" role="alert">${esc(message)}</p>`;

const webError = (message: string, status: number, headers?: HeadersInit): Response =>
  new Response(webErrorFragment(message), {
    status,
    headers: { 'Content-Type': 'text/html', ...headers },
  });

export const unauthenticatedResponse = (json: boolean): Response => {
  if (json) {
    return Response.json(
      { error: 'Verify your email to use the public instance.', auth: 'email-otp' },
      { status: 401 }
    );
  }
  return new Response(
    `<p class="mt-8 text-center" role="alert">Verify your email to use the public instance. <a class="underline" href="/">Get a code</a>.</p>`,
    { status: 401, headers: { 'Content-Type': 'text/html' } }
  );
};

export const quotaExceededResponse = (
  verdict: QuotaVerdict,
  json = true
): Response => {
  const message = `Public instance quota reached. Try again in ${verdict.retryAfterSec}s.`;
  const headers = { 'Retry-After': String(verdict.retryAfterSec) };
  if (!json) return webError(message, 429, headers);
  return Response.json(
    { error: message, retryAfter: verdict.retryAfterSec },
    { status: 429, headers }
  );
};

export const quotaUnavailableResponse = (json = true): Response => {
  const message = 'Quota check unavailable, try again shortly.';
  if (!json) return webError(message, 503);
  return Response.json({ error: message }, { status: 503 });
};

export const gateMisconfiguredResponse = (json = true): Response => {
  const message = 'Public instance login is misconfigured, try again later.';
  if (!json) return webError(message, 503);
  return Response.json({ error: message }, { status: 503 });
};
