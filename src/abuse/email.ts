// Allowlist over blocklist: free anonymous inboxes are the attacker's
// cheapest input. One-line change in review to adjust the set.
export const ALLOWED_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'gmx.net',
  'aol.com',
  'yandex.com',
  'zoho.com',
]);

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type EmailCheck =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

export function normalizeEmail(input: string): string {
  const email = input.trim().toLowerCase();
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  // Known residual: gmail dot-trick/googlemail equivalence.
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${local.replace(/\./g, '')}@gmail.com`;
  }
  return email;
}

// Syntax + alias + provider checks run before any Plunk send.
export function checkEmailPolicy(input: string): EmailCheck {
  const email = input.trim().toLowerCase();
  if (!EMAIL_FORMAT.test(email) || email.split('@').length !== 2) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  const [local, domain] = email.split('@');
  if (local.includes('+')) {
    return { ok: false, error: 'Plus-aliases (+) are not accepted; use your base address.' };
  }
  // `|` is the session-token field separator; rejecting it keeps tokens parseable.
  if (local.includes('|')) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (!ALLOWED_EMAIL_DOMAINS.has(domain)) {
    return { ok: false, error: 'Only popular mailbox providers are accepted on the public instance.' };
  }
  return { ok: true, normalized: normalizeEmail(email) };
}
