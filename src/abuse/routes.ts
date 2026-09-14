import { ENV } from '~/config/env';
import { requestCodeSchema, verifyCodeSchema } from '~/schemas/auth.schema';
import { logger } from '~/utils/logger';
import { firstValidationMessage } from '~/utils/zod';
import { primaryButtonFullClass } from '~/views/components/button';

import { checkEmailPolicy } from './email';
import { esc, isGateEnabled, wantsJson } from './gate';
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

// Composed gate panel: heading + guidance + form, one step at a time.
// The wrapper carries the gate Stimulus controller (focus, 6-box input,
// resend countdown); #gate-panel itself persists across swaps and announces.
const panelOpen = `<div data-controller="gate" class="flex w-full flex-col items-center gap-3">`;

export const emailFormFragment = (
  email = '',
  error = '',
  countdownSec = 0
): string => `
  ${panelOpen}
    <h2 class="text-center text-2xl font-light uppercase text-white md:text-3xl">Welcome</h2>
    <p class="text-center text-sm text-zinc-400">Try the public instance. It runs on free tiers, so we ask for your email to confirm you are human and track fair use. Never marketing. We will send a 6-digit code, and your session lasts 30 days.</p>
    ${error ? `<p class="text-center text-sm text-red-400" role="alert">${esc(error)}</p>` : ''}
    ${countdownSec > 0 ? `<p class="text-center text-sm text-zinc-400" data-gate-target="countdown" data-gate-seconds-value="${countdownSec}">Try again in ${countdownSec}s.</p>` : ''}
    <form hx-post="/api/auth/request-code" hx-target="#gate-panel" hx-swap="innerHTML" class="flex w-full flex-col gap-2">
      <label for="gate-email" class="sr-only">Email</label>
      <input id="gate-email" type="email" name="email" required value="${esc(email)}"
        class="min-h-[48px] w-full rounded-lg bg-zinc-700 p-2.5 text-base font-normal text-white placeholder:text-zinc-400"
        placeholder="you@gmail.com" />
      <button type="submit" class="${primaryButtonFullClass}">Get code</button>
    </form>
  </div>`;

const codeBoxes = (email: string, code = ''): string => `
  <div class="grid w-full grid-cols-6 gap-2" role="group" aria-label="6-digit code">
    ${[0, 1, 2, 3, 4, 5]
      .map(
        i => `<input type="text" data-gate-target="box" data-action="input->gate#fill keydown->gate#move paste->gate#split"
          inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" aria-label="Digit ${i + 1}" value="${esc(code[i] ?? '')}"
          class="h-14 rounded-lg bg-zinc-700 text-center text-2xl font-normal text-white focus:outline-none focus:ring-1 focus:ring-white" />`
      )
      .join('')}
  </div>
  <input type="hidden" name="email" value="${esc(email)}" />
  <input type="hidden" name="code" data-gate-target="code" value="${esc(code)}" />`;
  // NOTE: no <noscript> fallback input here. htmx parses swap responses
  // inside a <template> element, where scripting is disabled and <noscript>
  // content parses as live, submittable controls. A fallback code input
  // would double-submit alongside the hidden field and the server keeps
  // the last value, which broke every verify (always the empty fallback).

const codeFormFragment = (email: string, error = '', code = ''): string => `
  ${panelOpen}
    <h2 class="text-lg font-medium">Check your inbox</h2>
    <p class="text-center text-sm text-zinc-400">Code sent to ${esc(email)}. It expires in about 10 minutes.</p>
    ${error ? `<p class="text-center text-sm text-red-400" role="alert">${esc(error)}</p>` : ''}
    <form hx-post="/api/auth/verify-code" hx-target="#gate-panel" hx-swap="innerHTML" class="flex w-full flex-col items-center gap-3">
      ${codeBoxes(email, code)}
      <button type="submit" class="${primaryButtonFullClass}">Verify</button>
    </form>
  </div>`;

const webFormError = (
  fragment: string,
  status: number,
  headers?: HeadersInit
): Response =>
  new Response(fragment, {
    status,
    headers: { 'Content-Type': 'text/html', ...headers },
  });

export const codeSentFragment = (email: string): string =>
  codeFormFragment(email);

export async function requestCodeHandler(req: Request): Promise<Response> {
  const json = wantsJson(req);
  if (!isGateEnabled()) {
    return json
      ? Response.json({ error: 'Gate is disabled.' }, { status: 400 })
      : webFormError(emailFormFragment('', 'Gate is disabled.'), 400);
  }

  const raw = await readBody(req);
  const typedEmail =
    raw && typeof raw['email'] === 'string' ? raw['email'] : '';
  const parsed = requestCodeSchema.safeParse({ body: raw });
  if (!parsed.success) {
    const message = firstValidationMessage(parsed.error);
    return json
      ? Response.json({ error: message }, { status: 400 })
      : webFormError(emailFormFragment(typedEmail, message), 400);
  }

  const policy = checkEmailPolicy(parsed.data.body.email);
  if (!policy.ok) {
    return json
      ? Response.json({ error: policy.error }, { status: 400 })
      : webFormError(
          emailFormFragment(parsed.data.body.email, policy.error),
          400
        );
  }

  // Fail closed when misconfigured: codes must verify and need a template.
  const secret = ENV.abuse.sessionSecret;
  if (!secret || !ENV.abuse.plunkTemplateId) {
    const message = 'Public instance login is misconfigured, try again later.';
    return json
      ? Response.json({ error: message }, { status: 503 })
      : webFormError(
          emailFormFragment(parsed.data.body.email, message),
          503
        );
  }

  // Throttle before the Plunk backstop: throttled resends cost no subrequest.
  const waitSec = checkResendThrottle(policy.normalized);
  if (waitSec > 0) {
    const message = `Code already sent. Try again in ${waitSec}s.`;
    const headers = { 'Retry-After': String(waitSec) };
    return json
      ? Response.json(
          { error: message, retryAfter: waitSec },
          { status: 429, headers }
        )
      : webFormError(
          emailFormFragment(parsed.data.body.email, message, waitSec),
          429,
          headers
        );
  }

  const backstop = await verifyEmailWithPlunk(policy.normalized);
  if (!backstop.ok) {
    return json
      ? Response.json({ error: backstop.error }, { status: 400 })
      : webFormError(
          emailFormFragment(parsed.data.body.email, backstop.error),
          400
        );
  }

  const code = await issueOtp(policy.normalized, secret);
  try {
    await sendOtpEmail(policy.normalized, code);
  } catch (err) {
    logger.error(`[abuse] Plunk send failed: ${err}`);
    const message = 'Could not send the code, try again later.';
    return json
      ? Response.json({ error: message }, { status: 502 })
      : webFormError(
          emailFormFragment(parsed.data.body.email, message),
          502
        );
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
      : webFormError(emailFormFragment('', 'Gate is disabled.'), 400);
  }

  const raw = await readBody(req);
  const typedEmail =
    raw && typeof raw['email'] === 'string' ? raw['email'] : '';
  const parsed = verifyCodeSchema.safeParse({ body: raw });
  if (!parsed.success) {
    const message = firstValidationMessage(parsed.error);
    return json
      ? Response.json({ error: message }, { status: 400 })
      : webFormError(
          typedEmail
            ? codeFormFragment(typedEmail, message)
            : emailFormFragment('', message),
          400
        );
  }

  const policy = checkEmailPolicy(parsed.data.body.email);
  if (!policy.ok) {
    return json
      ? Response.json({ error: policy.error }, { status: 400 })
      : webFormError(
          emailFormFragment(parsed.data.body.email, policy.error),
          400
        );
  }

  const secret = ENV.abuse.sessionSecret;
  if (!secret) {
    const message = 'Public instance login is misconfigured, try again later.';
    return json
      ? Response.json({ error: message }, { status: 503 })
      : webFormError(codeFormFragment(policy.normalized, message), 503);
  }

  const valid = await verifyOtp(policy.normalized, parsed.data.body.code, secret);
  if (!valid) {
    const message = 'Invalid or expired code.';
    return json
      ? Response.json({ error: message }, { status: 400 })
      : webFormError(
          codeFormFragment(policy.normalized, message, parsed.data.body.code),
          400
        );
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
