import {
  base64UrlDecodeText,
  base64UrlEncodeText,
  hmacSha256,
  timingSafeEqual,
  toHex,
} from './crypto';

// Stateless session/bearer: token = base64url(email|expiry|sig) with
// sig = HMAC(session-secret, "session:email:expiry"). Same token rides the
// HttpOnly cookie (web) or Authorization: Bearer (API); 30-day TTL.
export const SESSION_COOKIE = 'idhs_session';
export const SESSION_TTL_SEC = 30 * 24 * 60 * 60;

export async function issueSessionToken(
  normalizedEmail: string,
  secret: string,
  nowMs: number = Date.now(),
  ttlSec: number = SESSION_TTL_SEC
): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Math.floor(nowMs / 1000) + ttlSec;
  const sig = toHex(await hmacSha256(secret, `session:${normalizedEmail}:${expiresAt}`));
  return {
    token: base64UrlEncodeText(`${normalizedEmail}|${expiresAt}|${sig}`),
    expiresAt,
  };
}

export async function verifySessionToken(
  token: string,
  secret: string,
  nowMs: number = Date.now()
): Promise<string | null> {
  const decoded = base64UrlDecodeText(token);
  if (!decoded) return null;
  const sep1 = decoded.indexOf('|');
  const sep2 = decoded.lastIndexOf('|');
  if (sep1 < 1 || sep2 <= sep1 + 1) return null;
  const email = decoded.slice(0, sep1);
  const expiry = Number(decoded.slice(sep1 + 1, sep2));
  const sig = decoded.slice(sep2 + 1);
  if (!email.includes('@') || !Number.isInteger(expiry)) return null;
  if (expiry * 1000 <= nowMs) return null;
  const expected = toHex(await hmacSha256(secret, `session:${email}:${expiry}`));
  return timingSafeEqual(sig, expected) ? email : null;
}

export function sessionCookieHeader(
  token: string,
  ttlSec: number = SESSION_TTL_SEC,
  secure = false
): string {
  const attrs = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${ttlSec}`,
  ];
  // From the request scheme, not ambient env: workerd has no NODE_ENV.
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

export function readSessionCookie(req: Request): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === SESSION_COOKIE) {
      return part.slice(idx + 1).trim() || null;
    }
  }
  return null;
}

export function readBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const parts = header.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  return parts[0]?.toLowerCase() === 'bearer' && parts[1] ? parts[1] : null;
}
