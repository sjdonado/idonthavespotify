import { describe, expect, it } from 'bun:test';

import {
  issueSessionToken,
  SESSION_TTL_SEC,
  sessionCookieHeader,
  verifySessionToken,
} from '~/abuse/session';

const SECRET = 'session-test-secret';

describe('Stateless session/bearer tokens', () => {
  it('round-trips the email', async () => {
    const { token, expiresAt } = await issueSessionToken('user@gmail.com', SECRET);
    expect(expiresAt).toBeGreaterThan(Date.now() / 1000);
    await expect(verifySessionToken(token, SECRET)).resolves.toBe('user@gmail.com');
  });

  it('rejects tampered tokens and wrong secrets', async () => {
    const { token } = await issueSessionToken('user@gmail.com', SECRET);
    const tampered = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
    await expect(verifySessionToken(tampered, SECRET)).resolves.toBeNull();
    await expect(verifySessionToken(token, 'other-secret')).resolves.toBeNull();
    await expect(verifySessionToken('not-a-token', SECRET)).resolves.toBeNull();
  });

  it('enforces expiry', async () => {
    const now = Date.now();
    const { token } = await issueSessionToken('user@gmail.com', SECRET, now, 60);
    await expect(verifySessionToken(token, SECRET, now)).resolves.toBe('user@gmail.com');
    await expect(
      verifySessionToken(token, SECRET, now + 61_000)
    ).resolves.toBeNull();
  });

  it('defaults to a 30-day TTL', async () => {
    const now = Date.now();
    const { expiresAt } = await issueSessionToken('user@gmail.com', SECRET, now);
    expect(expiresAt - Math.floor(now / 1000)).toBe(SESSION_TTL_SEC);
  });

  it('marks Secure only for https origins', () => {
    expect(sessionCookieHeader('t', 60, true)).toContain('Secure');
    expect(sessionCookieHeader('t', 60, false)).not.toContain('Secure');
  });
});
