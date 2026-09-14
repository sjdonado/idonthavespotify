import { ENV } from '~/config/env';
import { requestCodeSchema, verifyCodeSchema } from '~/schemas/auth.schema';
import { logger } from '~/utils/logger';
import { firstValidationMessage } from '~/utils/zod';

import { checkEmailPolicy } from './email';
import { isGateEnabled, wantsJson } from './gate';
import { issueOtp, verifyOtp } from './otp';
import {
  checkResendThrottle,
  markSent,
  sendOtpEmail,
  verifyEmailWithPlunk,
} from './plunk';
import { issueSessionToken, SESSION_TTL_SEC, sessionCookieHeader } from './session';

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await req.json()) as Record<string, unknown>;
    }
    if (req.body) return Object.fromEntries(await req.formData());
  } catch {
    return null;
  }
  return null;
}

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const codeSentFragment = (email: string): string => `
  <p class="text-sm text-zinc-400">Code sent to ${esc(email)}. It expires in about 10 minutes.</p>
  <form hx-post="/api/auth/verify-code" hx-target="#gate-panel" hx-swap="innerHTML" class="flex w-full max-w-3xl items-center justify-center px-2">
    <input type="hidden" name="email" value="${esc(email)}" />
    <label for="otp-code" class="sr-only">Code</label>
    <input id="otp-code" type="text" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required
      class="flex-1 rounded-lg bg-zinc-700 p-2.5 text-base font-normal text-white placeholder:text-zinc-400"
      placeholder="123456" />
    <button type="submit" class="ml-2 rounded-lg border border-green-500 bg-green-500 p-2.5 text-sm font-medium text-black">Verify</button>
  </form>`;

export async function requestCodeHandler(req: Request): Promise<Response> {
  const json = wantsJson(req);
  if (!isGateEnabled()) {
    return json
      ? Response.json({ error: 'Gate is disabled.' }, { status: 400 })
      : new Response('Gate is disabled.', { status: 400 });
  }

  const parsed = requestCodeSchema.safeParse({ body: await readBody(req) });
  if (!parsed.success) {
    const message = firstValidationMessage(parsed.error);
    return json
      ? Response.json({ error: message }, { status: 400 })
      : new Response(message, { status: 400 });
  }

  const policy = checkEmailPolicy(parsed.data.body.email);
  if (!policy.ok) {
    return json
      ? Response.json({ error: policy.error }, { status: 400 })
      : new Response(policy.error, { status: 400 });
  }

  // Fail closed when misconfigured: codes must verify and need a template.
  const secret = ENV.abuse.sessionSecret;
  if (!secret || !ENV.abuse.plunkTemplateId) {
    return json
      ? Response.json({ error: 'Demo gate is misconfigured, try again later.' }, { status: 503 })
      : new Response('Demo gate is misconfigured, try again later.', { status: 503 });
  }

  // Throttle before the Plunk backstop: throttled resends cost no subrequest.
  const waitSec = checkResendThrottle(policy.normalized);
  if (waitSec > 0) {
    return json
      ? Response.json(
          { error: `Code already sent. Try again in ${waitSec}s.`, retryAfter: waitSec },
          { status: 429, headers: { 'Retry-After': String(waitSec) } }
        )
      : new Response(`Code already sent. Try again in ${waitSec}s.`, { status: 429 });
  }

  const backstop = await verifyEmailWithPlunk(policy.normalized);
  if (!backstop.ok) {
    return json
      ? Response.json({ error: backstop.error }, { status: 400 })
      : new Response(backstop.error, { status: 400 });
  }

  const code = await issueOtp(policy.normalized, secret);
  try {
    await sendOtpEmail(policy.normalized, code);
  } catch (err) {
    logger.error(`[abuse] Plunk send failed for ${policy.normalized}: ${err}`);
    return json
      ? Response.json({ error: 'Could not send the code, try again later.' }, { status: 502 })
      : new Response('Could not send the code, try again later.', { status: 502 });
  }
  markSent(policy.normalized);

  return json
    ? Response.json({ ok: true })
    : new Response(codeSentFragment(policy.normalized), {
        headers: { 'Content-Type': 'text/html' },
      });
}

export async function verifyCodeHandler(req: Request): Promise<Response> {
  const json = wantsJson(req);
  if (!isGateEnabled()) {
    return json
      ? Response.json({ error: 'Gate is disabled.' }, { status: 400 })
      : new Response('Gate is disabled.', { status: 400 });
  }

  const parsed = verifyCodeSchema.safeParse({ body: await readBody(req) });
  if (!parsed.success) {
    const message = firstValidationMessage(parsed.error);
    return json
      ? Response.json({ error: message }, { status: 400 })
      : new Response(message, { status: 400 });
  }

  const policy = checkEmailPolicy(parsed.data.body.email);
  if (!policy.ok) {
    return json
      ? Response.json({ error: policy.error }, { status: 400 })
      : new Response(policy.error, { status: 400 });
  }

  const secret = ENV.abuse.sessionSecret;
  if (!secret) {
    return json
      ? Response.json({ error: 'Demo gate is misconfigured, try again later.' }, { status: 503 })
      : new Response('Demo gate is misconfigured, try again later.', { status: 503 });
  }

  const valid = await verifyOtp(policy.normalized, parsed.data.body.code, secret);
  if (!valid) {
    return json
      ? Response.json({ error: 'Invalid or expired code.' }, { status: 400 })
      : new Response('Invalid or expired code.', { status: 400 });
  }

  const { token } = await issueSessionToken(policy.normalized, secret);
  // Secure follows the client-facing scheme: X-Forwarded-Proto wins behind
  // a TLS-terminating proxy, where Bun itself only ever sees http.
  const forwarded = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  const secure = forwarded ? forwarded === 'https' : new URL(req.url).protocol === 'https:';
  const cookie = sessionCookieHeader(token, SESSION_TTL_SEC, secure);

  // No bearer tokens: the cookie is the only credential, so only the
  // first-party frontend (which stores it) authenticates. Third-party API
  // clients stay a self-hosted story, where the gate is off.
  if (json) {
    return Response.json({ ok: true }, { headers: { 'Set-Cookie': cookie } });
  }

  // Web flow: cookie authenticates, HX-Refresh reveals search immediately.
  return new Response(
    `<p class="text-sm text-zinc-400">Verified. <a class="underline" href="/">Start searching</a>.</p>`,
    {
      headers: {
        'Content-Type': 'text/html',
        'Set-Cookie': cookie,
        'HX-Refresh': 'true',
      },
    }
  );
}
