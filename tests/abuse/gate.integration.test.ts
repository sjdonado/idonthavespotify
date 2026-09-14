import type { Server } from 'bun';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

import { issueOtp } from '~/abuse/otp';
import { resetResendThrottle } from '~/abuse/plunk';
import { resetLocalQuota } from '~/abuse/quota';
import { ENV } from '~/config/env';
import { cacheStore } from '~/services/cache';

// Gate on for this file only (bun test --isolate keeps it per-file): the
// gate arms on a non-blank Plunk key, no separate flag exists.
process.env['SESSION_SECRET'] ||= 'test-gate-secret';
process.env['PLUNK_API_KEY'] ||= 'test-plunk-key';
process.env['PLUNK_TEMPLATE_ID'] ||= 'test-template-id';

import { loadHeadSnapshots } from '../mocks/snapshots';
import { HttpMock } from '../utils/http-mock';
import { createTestApp, formDataFromObject, nodeFetch } from '../utils/request';

// NOTE: no ../utils/shared import here — it reads ENV at module-eval time,
// which would freeze config before the per-file env assignment above runs.
const apiSearchEndpoint = (baseUrl: URL) => `${baseUrl}api/search?v=1`;

const headSnapshots = loadHeadSnapshots();
const SECRET = process.env['SESSION_SECRET'] as string;
const LINK = 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc';

describe('Email OTP gate', () => {
  let app: Server<undefined>;
  let searchEndpointUrl: string;
  let httpMock: HttpMock;

  beforeAll(() => {
    app = createTestApp();
    searchEndpointUrl = apiSearchEndpoint(app.url);
    httpMock = new HttpMock();
  });

  afterAll(() => {
    app.stop();
    httpMock.restore();
  });

  beforeEach(() => {
    cacheStore.reset();
    resetLocalQuota();
    resetResendThrottle();
    httpMock.reset();

    httpMock
      .onPost(`${ENV.abuse.plunkApiUrl}/v1/verify`)
      .reply(200, { success: true, data: { valid: true, hasMxRecords: true } });
    httpMock
      .onPost(`${ENV.abuse.plunkApiUrl}/v1/send`)
      .reply(200, { success: true });
  });

  it('rejects unauthenticated API search with a machine-readable hint', async () => {
    const response = await nodeFetch(searchEndpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: LINK }),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: expect.any(String),
      auth: 'email-otp',
    });
  });

  it('rejects unauthenticated web search and gated share pages', async () => {
    const web = await nodeFetch(`${app.url}search`, {
      method: 'POST',
      body: formDataFromObject({ link: LINK }),
    });
    expect(web.status).toBe(401);

    // Gate runs before validation: no validity oracle for strangers.
    const invalid = await nodeFetch(searchEndpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: 'https://open.spotify.com/invalid' }),
    });
    expect(invalid.status).toBe(401);
    expect(await invalid.json()).toEqual({
      error: expect.any(String),
      auth: 'email-otp',
    });

    const page = await nodeFetch(`${app.url}?id=whatever`);
    expect(page.status).toBe(401);
    expect(page.headers.get('x-auth-required')).toBe('email-otp');
    expect(await page.text()).toContain('gate-panel');
  });

  it('requests, throttles, and verifies codes', async () => {
    const email = 'Gate.User@gmail.com';

    const requested = await nodeFetch(`${app.url}api/auth/request-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    expect(requested.status).toBe(200);
    expect(await requested.json()).toEqual({ ok: true });

    const throttled = await nodeFetch(`${app.url}api/auth/request-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    expect(throttled.status).toBe(429);

    const wrong = await nodeFetch(`${app.url}api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: '000000' }),
    });
    expect(wrong.status).toBe(400);

    const code = await issueOtp('gateuser@gmail.com', SECRET);
    const verified = await nodeFetch(`${app.url}api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    expect(verified.status).toBe(200);
    // No bearer tokens: the login cookie is the only credential.
    expect(await verified.json()).toEqual({ ok: true });
    expect(verified.headers.get('set-cookie')).toMatch(/^idhs_session=/);
  });

  it('rejects aliases and unknown providers before any send', async () => {
    for (const email of ['name+tag@gmail.com', 'user@evil.example']) {
      const response = await nodeFetch(`${app.url}api/auth/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      expect(response.status).toBe(400);
    }
  });

  it('enforces the per-email quota and surfaces it on status', async () => {
    const email = 'quota.user@yahoo.com';
    await nodeFetch(`${app.url}api/auth/request-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const code = await issueOtp('quota.user@yahoo.com', SECRET);
    const verified = await nodeFetch(`${app.url}api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    expect(verified.status).toBe(200);
    // Replay the login cookie like the first-party frontend would.
    const sessionCookie = verified.headers.get('set-cookie')?.split(';')[0] as string;
    expect(sessionCookie).toMatch(/^idhs_session=/);
    const auth = {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    };

    const status = await nodeFetch(`${app.url}api/status`, { headers: auth });
    const statusData = (await status.json()) as {
      gate: { enabled: boolean; quota: { limit: number } };
      identity?: { remaining: number };
    };
    expect(statusData.gate.enabled).toBe(true);
    expect(statusData.gate.quota.limit).toBe(6);
    expect(statusData.identity?.remaining).toBe(6);

    httpMock
      .onGet('https://open.spotify.com/embed/track/3AhXZa8sUQht0UEdBJgpGc')
      .reply(200, headSnapshots.spotifyTrackRollingStone);
    httpMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);
    httpMock.onGet(/youtube/).reply(500);
    httpMock.onGet(/music\.apple\.com/).reply(500);
    httpMock.onGet(/deezer/).reply(500);
    httpMock.onGet(/soundcloud/).reply(500);

    // Invalid links fail validation without burning quota.
    const invalid = await nodeFetch(searchEndpointUrl, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ link: 'https://open.spotify.com/invalid' }),
    });
    expect(invalid.status).toBe(400);

    for (let i = 0; i < 6; i++) {
      const res = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ link: LINK }),
      });
      expect(res.status).toBe(200);
    }

    // No upstream mocks left: a 429 proves the gate denied before any call.
    httpMock.reset();
    const exhausted = await nodeFetch(searchEndpointUrl, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ link: LINK }),
    });
    expect(exhausted.status).toBe(429);
    expect(await exhausted.json()).toEqual({
      error: expect.stringMatching(/quota/i),
      retryAfter: expect.any(Number),
    });
  });
});
