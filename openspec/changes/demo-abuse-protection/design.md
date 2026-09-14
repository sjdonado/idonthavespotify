## Context

See proposal.md. Current state (post-#81, all live-verified): Workers demo serves all routes; Spotify outbound dead on edge (`TypeError: createHmac2 is not a function` in worker logs — Bun's browser-target `node:crypto` shim); Tidal search 400s on edge (auth succeeds, cause unknown); Dokku CI deploys a target nobody serves the demo from; README is terse; no identity layer. Constraints: free tier only, no new paid services, Plunk for mail, `.env` values never read.

## Goals / Non-Goals

**Goals:**

- Spotify and Tidal results on the demo matching self-host.
- Abuse-proofing via identity (OTP) plus the existing WAF rule, cheapest total: no Durable Object build, no KV writes, no stored sessions.
- CI ships the demo; docs guide instead of list.

**Non-Goals:**

- IP-rotation-proofing (impossible without paid signals; OTP raises attacker cost from zero to one inbox per identity).
- Magic links, passwords, OAuth, user profiles, marketing use of emails.
- Changing search ranking or adapter selection logic.

## Decisions

- **Spotify TOTP via WebCrypto.** `crypto.subtle` HMAC-SHA1 exists on Bun, Node 18+, Workers, and browsers. Replaces `createHmac` + all `Buffer` use in `generateTotp` with `Uint8Array`/`DataView` (counter via `setBigUint64`, hex via manual encode). `generateTotp` becomes async. Alternative (fixing Bun's crypto shim mapping) rejected: toolchain-owned, fragile across upgrades.
- **Tidal: instrument first, then fix.** Add upstream response bodies to `HttpClient` error logs (currently swallowed — this exact blindness cost a debug round), replay the identical query self-host vs edge, fix the query if the v2 API moved, else document the gap. No code assumption baked in.
- **Stateless OTP (TOTP-style), not stored codes.** Code = truncated HMAC(session-secret, email + 5-min window), verified by recompute; tolerant of ±1 window for clock/email-delay skew; single-use via a spent-cache only if abuse appears (YAGNI until then). Why: zero writes fits free tier and per-isolate memory (the property that killed KV/DO counters), and verification works on any isolate. Plunk sends the code with non-persistent template data per their documented one-shot pattern; Plunk `/v1/verify` backstops disposables/MX/typos.
- **Provider allowlist as a checked-in const** (gmail, outlook/hotmail/live, yahoo, icloud/me/mac, proton, gmx, aol, yandex, zoho — finalize in review), plus-alias rejected by syntax before any send. Why allowlist over blocklist: abuse economics — free anonymous inboxes are the attacker's cheapest input.
- **No signup page: gate UI inline** in the home view (email field where the search bar is; OTP field replaces it on send). Session = signed HttpOnly cookie; API = short-lived bearer from the same verify endpoint via content negotiation. Gate placement: middleware-style wrapper around the four search handlers in `createRoutes` so both runtimes inherit it; static assets and `/api/status` stay open (status is needed for monitoring and leaks nothing).
- **Rate limit: per-email quota in a Durable Object.** Each verified email gets 6 searches per rolling 4 min; past it, 429 plus a 2-min cooldown. The DO stores only email-hash window counters (tiny rows, auto-expire via alarms), so free-tier budgets hold: well under 100k DO req/day at demo scale, one DO subrequest per search. This reverses the earlier no-DO decision, but scoped to identity keys it is small and abuse-meaningful where the global IP counter was neither. WAF rule stays as the outer flood layer; service guards stay the upstream fuse. Fail-open vs fail-closed on DO error: fail closed for quota checks (abuse safety) — decided, since a DO outage otherwise equals unlimited searches. Flip condition: quota abuse persisting past identity cost (then allowlist tightening, not more infra).
- **CI deploy via Wrangler with an API token secret** (`CLOUDFLARE_API_TOKEN` + account ID), `wrangler deploy` after the existing build/audit/smoke jobs. OIDC preferred if the account supports it; token is the documented fallback. Dokku workflow deleted; binary self-host docs stay.
- **CI deploy via Wrangler with an API token secret** (`CLOUDFLARE_API_TOKEN` + account ID), `wrangler deploy` after the existing build/audit/smoke jobs. OIDC preferred if the account supports it; token is the documented fallback. Dokku workflow deleted; binary self-host docs stay.
- **Docs voice: full prose in `.md`.** Terse style stays in code/comments/commits/PRs; markdown guides a stranger, so it explains. Workers operational detail moves README → AGENTS.md; README keeps user/operator narrative.

## Risks / Trade-offs

- [Risk] WebCrypto `subtle` timing on 10ms CPU budget → Mitigation: one HMAC per token refresh (~hourly, cached), measured in staging deploy before merge.
- [Risk] Shared temp-mail domains inside allowlisted providers (gmail dot-trick,/googlemail) → Mitigation: normalize (strip dots for gmail/googlemail) at validation; document as known residual.
- [Risk] OTP email deliverability/latency (Plunk shared IPs, spam folders) → Mitigation: ±1 window tolerance, clear resend UX with resend throttling, Plunk template + verified domain required in setup docs.
- [Risk] Gate breaks Raycast extension until it implements bearer flow → Mitigation: bearer-via-JSON path ships in the same PR; extension update documented as follow-up; kill-switch covers emergencies.
- [Risk] Tidal 400 turns out to be Tidal blocking CF egress → Mitigation: same treatment as Apple Music gap (documented, tested miss, self-host unaffected).

## Migration Plan

- Deploy: merge, CI ships worker; Plunk key/domain + session secret added as worker secrets first (documented checklist, values never in repo); WAF rule untouched; kill-switch env documented for instant rollback of the gate without redeploy.
- Rollback: revert commits; prior worker version via `wrangler rollback` if needed.

## Open Questions

- Exact provider allowlist (propose the const in review; one-line change either way).
- Locked: 6-digit codes, 10-minute validity, 30-day bearer TTL, Dokku fully removed, per-email quota 6/4min + 2-min cooldown in a DO, fail-closed quota checks.
