import { hmacSha256, timingSafeEqual, truncateToCode } from './crypto';

// Stateless OTP: code = truncated HMAC(session-secret, email + 5-min
// window). No server-side storage, so any isolate can verify. ±1 window
// tolerance covers email latency and clock skew (~10-15 min validity).
export const OTP_WINDOW_SEC = 300;
export const OTP_TOLERANCE_WINDOWS = 1;
export const OTP_DIGITS = 6;

export const otpWindow = (nowMs: number): number =>
  Math.floor(nowMs / 1000 / OTP_WINDOW_SEC);

export async function issueOtp(
  normalizedEmail: string,
  secret: string,
  nowMs: number = Date.now()
): Promise<string> {
  const mac = await hmacSha256(secret, `otp:${normalizedEmail}:${otpWindow(nowMs)}`);
  return truncateToCode(mac, OTP_DIGITS);
}

export async function verifyOtp(
  normalizedEmail: string,
  code: string,
  secret: string,
  nowMs: number = Date.now()
): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const window = otpWindow(nowMs);
  for (let w = window - OTP_TOLERANCE_WINDOWS; w <= window + OTP_TOLERANCE_WINDOWS; w++) {
    const mac = await hmacSha256(secret, `otp:${normalizedEmail}:${w}`);
    if (timingSafeEqual(truncateToCode(mac, OTP_DIGITS), code)) return true;
  }
  return false;
}
