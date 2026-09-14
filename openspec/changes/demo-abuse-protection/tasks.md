## 1. Edge adapter parity

- [x] 1.1 Spotify TOTP via WebCrypto (drop `node:crypto` + `Buffer` in `generateTotp`, async); live-verify Spotify adapter on the demo
- [x] 1.2 Tidal 400 diagnosis (upstream bodies in error logs, self-host vs edge replay); fix query or document the gap with a tested miss
- [x] 1.3 Regression tests: mocked token-flow HMAC vector, Tidal outcome pin

## 2. Email OTP gate

- [x] 2.1 Stateless OTP core (HMAC time-window issue/verify, ±1 tolerance) + unit tests (vectors, expiry, cross-instance verify)
- [x] 2.2 Email policy (provider const, alias rejection, gmail normalization, Plunk `/v1/verify` backstop) + tests
- [x] 2.3 Plunk send client (non-persistent template data, resend throttle) + route pair (request-code, verify-code with JSON/cookie negotiation)
- [x] 2.4 Gate wiring in `createRoutes` (search handlers only; status/assets open) + env kill-switch + web inline UI (no signup page) + session-cookie auth (no bearer flow)
- [x] 2.5 Abuse-only data handling note (no marketing, minimal retention) in README/AGENTS
- [x] 2.6 Quota DO (email-hash rolling windows, 6/4min + 2-min cooldown, fail-closed checks, alarms cleanup) + tests + `/api/status` quota visibility

## 3. CI and docs

- [x] 3.1 Replace Dokku workflow with Wrangler deploy (secrets documented by name; post-deploy smoke)
- [x] 3.2 README rewrite (full prose) + Workers ops detail moved to AGENTS.md + `.md` voice rule recorded in AGENTS.md
- [x] 3.3 Record the no-DO rate limit decision with flip condition
