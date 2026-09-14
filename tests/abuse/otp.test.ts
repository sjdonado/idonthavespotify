import { describe, expect, it } from 'bun:test';

import { issueOtp, OTP_WINDOW_SEC, verifyOtp } from '~/abuse/otp';

const SECRET = 'otp-test-secret';

describe('Stateless OTP', () => {
  it('issues a 6-digit code that verifies', async () => {
    const code = await issueOtp('user@gmail.com', SECRET);
    expect(code).toMatch(/^\d{6}$/);
    await expect(verifyOtp('user@gmail.com', code, SECRET)).resolves.toBe(true);
  });

  it('tolerates ±1 window for email/clock skew', async () => {
    const now = Date.now();
    const windowMs = OTP_WINDOW_SEC * 1000;
    const base = Math.floor(now / windowMs) * windowMs + 1000;
    const code = await issueOtp('user@gmail.com', SECRET, base);
    await expect(verifyOtp('user@gmail.com', code, SECRET, base + windowMs)).resolves.toBe(true);
    await expect(verifyOtp('user@gmail.com', code, SECRET, base - windowMs)).resolves.toBe(true);
  });

  it('expires outside the tolerance', async () => {
    const now = Date.now();
    const code = await issueOtp('user@gmail.com', SECRET, now);
    await expect(
      verifyOtp('user@gmail.com', code, SECRET, now + 3 * OTP_WINDOW_SEC * 1000)
    ).resolves.toBe(false);
  });

  it('verifies across isolates (no shared state)', async () => {
    const code = await issueOtp('user@gmail.com', SECRET);
    // A second "instance" holding only the same secret verifies.
    await expect(verifyOtp('user@gmail.com', code, SECRET)).resolves.toBe(true);
    await expect(verifyOtp('user@gmail.com', code, 'other-secret')).resolves.toBe(false);
  });

  it('rejects malformed codes and other emails', async () => {
    await expect(verifyOtp('user@gmail.com', 'abc', SECRET)).resolves.toBe(false);
    const code = await issueOtp('user@gmail.com', SECRET);
    await expect(verifyOtp('other@gmail.com', code, SECRET)).resolves.toBe(false);
  });
});
