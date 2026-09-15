# IDHS (I Don't Have Spotify) — agent instructions

Bun + TypeScript server that converts a streaming-service link into links on other platforms. SSR pages via nano-jsx, fragment updates via htmx, small Stimulus controllers for client behavior.

## Directory map

- `src/index.ts` — HTTP server (`Bun.serve` with `routes`): `GET /`, `POST /search` (htmx HTML fragment), `POST /api/search`, `POST /api/auth/request-code`, `POST /api/auth/verify-code`, `GET /api/status`, static fallback for `public/`.
- `src/parsers/` — identify the incoming link's platform, extract normalized metadata + search query.
- `src/adapters/` — turn the query into outbound links per destination platform.
- `src/abuse/` — public instance gate: stateless OTP (`otp.ts`), email policy (`email.ts`), Plunk client (`plunk.ts`), session tokens (`session.ts`, cookie-only, no bearers), per-email quota (`quota.ts`), Durable Object (`quota-do.ts`), gate checks + auth route handlers (`gate.ts`, `routes.ts`).
- `src/services/` — `search.ts` orchestration, in-memory `cache.ts`, `metadata.ts` helpers, `musicbrainz.ts` fallback (fills missed adapters from curated streaming relations).
- `src/schemas/` — zod route schemas (`auth.schema.ts` covers the gate endpoints); `src/config/` — enums, constants, env.
- `src/utils/` — `http-client.ts` (all outbound HTTP goes through `impit` here), logger, scraper, service guard (per-service upstream budgets + circuit breaker).
- `src/views/` — nano-jsx components/layouts/pages (`components/gate.tsx` is the inline OTP panel), `controllers/*.js` (Stimulus, plain JS), `css/index.css` (Tailwind).
- `tests/` — integration tests (`api`, `page`, `abuse/gate`), unit tests (`parsers`, `search`, `utils`, `abuse`, `spotify-totp`); `tests/utils/http-mock.ts` stubs `HttpClient` statics (non-2xx mocks carry a body snippet, mirroring production `HttpClientError.body`); `tests/mocks/` holds HTML/JSON snapshots.
- `scripts/fetch-snapshots.ts` — regenerates `tests/mocks/` from live URLs (network).
- `build.config.ts` — Tailwind CLI + browser JS bundling for `public/assets/`.
- `API.md` — public API contract (includes the gate auth endpoints; cookie session, no bearer flow — programmatic clients target self-host); `README.md` — user/operator narrative.

## Prerequisites

- Bun 1.4.2 is the locally installed runtime (`bun --version`). Note the toolchain floats: Dockerfile builds on `oven/bun:1-alpine` and CI uses `oven-sh/setup-bun@v1` with no version input, so CI may run a newer Bun than local.
- `bun install` before anything else (Dockerfile uses `--frozen-lockfile`). Never read `.env` values; the variable *names* are listed in `.env.test`, and README links the portals that issue the real values.

## Commands (run from repo root)

| Command | What it does | Status |
|---|---|---|
| `bun run dev` | asset watcher + `bun run --watch src/index.ts` (port `PORT` or 3000) | defined, not run here |
| `bun run build` | production CSS + browser JS into `public/assets/` | defined, not run here |
| `bun run build:prod` | `--compile` single binary at `dist/idonthavespotify` | defined, not run here |
| `bun run build:workers` | edge bundle at `dist/workers.js` (fetch backend, console logger) | defined, not run here |
| `bun run typecheck` | `tsc --noEmit` (self-host) + workers tsconfig | verified passing |
| `bun run lint` | eslint over `src` and `tests` | verified passing |
| `bun run test` | `NODE_ENV=test bun test` (offline via `HttpMock` + local snapshots) | verified passing |
| `bun run test:ci` | regenerates snapshots from live URLs, then tests | defined, not run here (needs network; snapshots are gitignored but present in a set-up tree) |

CI: PRs run `tests.yml` (loads `.env.test` into env, then `test:ci`, plus asset/binary/edge build, native-import audit, and binary smoke); pushes to `master` run `deploy.yml` (typecheck, lint, edge build + audit, `wrangler deploy`, post-deploy smoke of `/`, `/api/status`, invalid-link 400).

## Conventions and easy-to-miss constraints

- Import alias `~/*` maps to `./src/*` (see `tsconfig.json`); keep it in new imports.
- JSX is nano-jsx classic runtime (`jsxFactory Nano.h`); client controllers stay plain `.js`.
- htmx is pinned via a CDN script tag in `src/views/layouts/main.tsx`; Stimulus is bundled into `public/assets/index.js` by `build.config.ts`.
- `public/assets/*.js|css` are build artifacts and gitignored; never edit them, rebuild instead.
- `tests/mocks/**/*.html|json` are gitignored snapshots: if tests fail with missing-mock errors on a fresh clone, run `bun run test:mocks:fetch` (live network) before `bun run test`.
- Always run tests through `bun run test`, not bare `bun test`.
- Outbound HTTP must go through `HttpClient` so tests can stub it; no direct `fetch`/`impit` calls in adapters or parsers.
- Upstream error bodies must reach the logs: `HttpClientError` carries a 500-char `body` snippet, and adapters log it. Never swallow a non-2xx without its body.
- Tidal has no outbound adapter: its search API needs a portal-granted entitlement that was refused (`invalid_scope` on the token, `INVALID_RESOURCE_ID` on every query), and its search pages sit behind a bot wall. Tidal links resolve through the MusicBrainz fallback instead (`src/services/musicbrainz.ts`, polite UA plus ~1s pacing per its rate rules); do not re-add a Tidal adapter without portal access.
- Env access is centralized in `src/config/env.ts` (lazy proxy over edge bindings, `Bun.env`, `process.env`); read new vars there, not inline. Never read `ENV` at module scope in `src`: the first read freezes the lazy cache, which breaks per-file test env assignments the same way `tests/utils/shared.ts` does. Read it per request instead. New gate vars: `PLUNK_API_KEY` (non-blank arms the gate; blank/unset is open access, the self-host default — there is intentionally no separate flag), `SESSION_SECRET`, `PLUNK_TEMPLATE_ID` (required when the gate is on; the template defines sender, subject, and body), `PLUNK_API_URL` (optional, defaults to `https://next-api.useplunk.com`). `IDHS_API_KEY_BETA` stays dormant (read, never used); do not build auth logic on it.
- `tests/utils/shared.ts` reads `ENV` at module-eval time, which freezes the lazy env cache for the whole test file. Any test file that sets `process.env` per-file (e.g. the gate suite) must not import it; inline the endpoint builder instead. Use `||=`, not `??=`, for per-file keys: `.env.test` declares some vars blank, and blank is not nullish.
- Production image (`Dockerfile`) ships the compiled binary plus a `public/` copy; static assets resolve from disk at runtime, not from inside the binary.
- `public/llms.txt` is a public contract read by external agents: any change to routes, auth, URLs, adapters, or response shapes must update it in the same commit as `API.md`/`README.md`. It rots silently because nothing executes it.
- Markdown voice rule: `.md` files guide a stranger, so they use full explanatory prose. Terse style stays in code, comments, commit messages, and PR text. Never write terse checklist-style markdown.

## Workers operations (public instance only)

- Deploy is CI-owned (`deploy.yml` on push to `master`); manual equivalent is `bun run build:workers` then `bunx wrangler deploy` from a logged-in account. `wrangler.toml` pins `nodejs_compat`, a compatibility date, Workers Assets for `public/`, and the `QUOTA_DO` Durable Object binding plus its `v1` migration.
- Worker secrets (names only, values never in repo; set with `bunx wrangler secret put`): `PLUNK_API_KEY` (its presence arms the gate), `SESSION_SECRET`, `PLUNK_TEMPLATE_ID` (required when the gate is on; the template defines sender, subject, and body). Plunk also needs a verified sender domain in its dashboard. Kill-switch is blanking or deleting the `PLUNK_API_KEY` secret: open access without redeploy.
- GitHub deploy secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, optional `DEMO_URL` (smoke target, defaults to `https://idonthavespotify.sjdonado.com`).
- Edge deltas vs self-host: platform `fetch` instead of TLS impersonation (guarded sources may answer differently; Spotify metadata resolves via `__NEXT_DATA__` embed pages on both runtimes; Apple Music resolves via the same-host catalog chain with no audio preview), per-isolate in-memory cache (service-guard budgets stay the shared quota protection), no URL shortener (share links are always plain app URLs), no per-IP limiting in the app, and platform CPU and memory limits.
- Edge abuse protection is two layers plus the gate: one Cloudflare rate limiting rule (free plans include exactly one), because only the edge can count globally across isolates. Create it under Security > WAF > Rate limiting rules:
  - Rule name: `idhs-demo-abuse-guard`
  - Expression: `(http.request.uri.path in {"/" "/search" "/api/search" "/api/auth/request-code" "/api/auth/verify-code"})` (auth endpoints included so OTP codes cannot be hammered past the identity cost)
  - Characteristics: IP plus `cf.colo.id`; Requests: 4; Period: 10 seconds; Block for: 10 seconds (all three are free-plan-pinned — the API rejects any other period or mitigation timeout, and requires `cf.colo.id` alongside the IP characteristic; 4 admits a legit burst — page load plus search — while capping a paced abuser at ~24/min instead of ~60/min)
  - Action: Block (exceeding clients get an error response; confirm the exact status in the dashboard preview)
- The threshold is deliberately abuse-level, not UX-level: no human pasting links hits 60/min. Floods die at the edge before consuming worker quota or subrequests; per-email quota 429s are the identity layer above it, and per-service circuit breakers stay the final fuse for upstream quotas. Keep Bot Fight Mode on (free) for known-bot junk, and tighten or add Under Attack Mode only as incident response.

## Abuse-gate decisions (do not re-derive without new evidence)

- Per-email quota in a Durable Object (6 searches per rolling 4 min, 2-min cooldown, fail-closed checks, email-hash keys, alarm expiry). An earlier no-DO sketch was rejected: scoped to identity keys the counter is small and abuse-meaningful, where a global per-IP counter was neither. Flip condition: quota abuse persisting past identity cost means tightening the provider allowlist, not adding more infra.
- Stateless OTP and session tokens (HMAC with `SESSION_SECRET`, 5-min windows with ±1 tolerance, 30-day cookie TTL, no bearer scheme). No stored codes, no KV writes; any isolate verifies. Single-use spent-cache only if abuse appears (YAGNI until then).
- Provider allowlist is a checked-in const in `src/abuse/email.ts` (one-line change to adjust); plus-aliases rejected before any send; Plunk `/v1/verify` backstops disposables/MX/typos and fails open when unreachable (OTP still costs one inbox).
- Emails are abuse-prevention data only: never marketing, codes sent with non-persistent Plunk template data. Say this in user-facing docs whenever the gate is mentioned.
- Spotify TOTP uses WebCrypto (`crypto.subtle` HMAC-SHA1), never `node:crypto`/`Buffer` in `generateTotp` (async). The decimal-concatenated secret quirk is preserved byte-identically and pinned by `tests/spotify-totp.test.ts` against a `node:crypto` reference.
