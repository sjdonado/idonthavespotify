import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { checkEmailPolicy, normalizeEmail } from '~/abuse/email';
import { verifyEmailWithPlunk } from '~/abuse/plunk';
import { ENV } from '~/config/env';

import { HttpMock } from '../utils/http-mock';

// Exercise the Plunk path even where the local .env lacks the new keys.
process.env['PLUNK_API_KEY'] ??= 'test-plunk-key';

describe('Email policy', () => {
  it('accepts allowlisted providers', () => {
    for (const email of ['a@gmail.com', 'a@outlook.com', 'a@yahoo.com', 'a@proton.me']) {
      const res = checkEmailPolicy(email);
      expect(res.ok).toBe(true);
    }
  });

  it('rejects unknown providers and bad syntax', () => {
    expect(checkEmailPolicy('a@evil.example').ok).toBe(false);
    expect(checkEmailPolicy('not-an-email').ok).toBe(false);
    expect(checkEmailPolicy('a@@gmail.com').ok).toBe(false);
  });

  it('rejects plus-aliases before any send', () => {
    const res = checkEmailPolicy('name+tag@gmail.com');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/alias/i);
  });

  it('normalizes gmail dot-trick addresses', () => {
    expect(normalizeEmail('First.Last@gmail.com')).toBe('firstlast@gmail.com');
    expect(normalizeEmail('First.Last@googlemail.com')).toBe('firstlast@gmail.com');
    expect(normalizeEmail('First.Last@outlook.com')).toBe('first.last@outlook.com');
  });

  it('rejects pipe characters that would break session tokens', () => {
    expect(checkEmailPolicy('a|b@gmail.com').ok).toBe(false);
  });
});

describe('Plunk verify backstop', () => {
  let httpMock: HttpMock;

  beforeEach(() => {
    httpMock = new HttpMock();
  });

  afterEach(() => {
    httpMock.restore();
  });

  it('rejects disposables and suggests typo fixes', async () => {
    httpMock
      .onPost(`${ENV.abuse.plunkApiUrl}/v1/verify`)
      .reply(200, { success: true, data: { valid: true, isDisposable: true } });
    const res = await verifyEmailWithPlunk('user@gmail.com');
    expect(res.ok).toBe(false);
  });

  it('passes clean addresses and fails open when Plunk is down', async () => {
    httpMock
      .onPost(`${ENV.abuse.plunkApiUrl}/v1/verify`)
      .reply(200, { success: true, data: { valid: true, hasMxRecords: true } });
    await expect(verifyEmailWithPlunk('user@gmail.com')).resolves.toEqual({ ok: true, suggestion: undefined });

    httpMock.reset();
    httpMock.onPost(`${ENV.abuse.plunkApiUrl}/v1/verify`).reply(500, 'down');
    await expect(verifyEmailWithPlunk('user@gmail.com')).resolves.toEqual({ ok: true });
  });
});
