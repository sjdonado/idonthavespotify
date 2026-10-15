# IDHS (I Don't Have Spotify) — agent instructions

Bun + TypeScript server that converts a streaming-service link into links on other platforms. SSR pages via nano-jsx, fragment updates via htmx, small Stimulus controllers for client behavior.

## Directory map

- `src/index.ts` — HTTP server (`Bun.serve` with `routes`): `GET /`, `POST /search` (htmx HTML fragment), `POST /api/search`, `POST /api/auth/request-code`, `POST /api/auth/verify-code`, `GET /api/status`, `GET /verify` (Cloudflare challenge landing that redirects back), static fallback for `public/`.
- `src/parsers/` — identify the incoming link's platform, extract normalized metadata + search query.
- `src/adapters/` — turn the query into outbound links per destination platform. `invidious.ts` is the exception: it derives a `redirect.invidious.io` link from the YouTube result and makes no upstream call.
- `src/services/` — `search.ts` orchestration, in-memory `cache.ts`, `metadata.ts` helpers, `musicbrainz.ts` fallback (fills missed adapters from curated streaming relations).
- `src/schemas/` contains the active zod route schemas; `src/config/` contains enums, constants, and runtime environment access.
- `src/utils/` — `http-client.ts` (all outbound HTTP goes through `impit` here), logger, scraper, service guard (per-service upstream budgets + circuit breaker).
- `src/views/` contains nano-jsx components/layouts/pages, `controllers/*.js` (Stimulus, plain JS), and `css/index.css` (Tailwind).
- `tests/` contains integration tests (`api`, `page`, `public-instance`) and unit tests (`parsers`, `search`, `utils`, `spotify-totp`). `tests/utils/http-mock.ts` stubs `HttpClient` statics; non-2xx mocks carry a body snippet, mirroring production `HttpClientError.body`. `tests/mocks/` holds HTML/JSON snapshots.
- `scripts/fetch-snapshots.ts` — regenerates `tests/mocks/` from live URLs (network).
- `build.config.ts` — Tailwind CLI + browser JS bundling for `public/assets/`.
- `API.md` documents the public API contract, including programmatic-access restrictions and retired login endpoints. `README.md` is the developer introduction and user/operator narrative.

## Prerequisites

- Bun 1.4.3 is the minimum runtime. Docker and CI pin 1.4.3. TypeScript 7.0.2 supplies `tsc` through the `@typescript/native` alias; the `typescript` alias supplies Microsoft's TypeScript 6 API compatibility package for ESLint.
- `bun install` before anything else (Dockerfile uses `--frozen-lockfile`). Never read `.env` values; the variable *names* are listed in `.env.test`, and README links the portals that issue the real values.

## Commands (run from repo root)

| Command | What it does | Status |
|---|---|---|
| `bun run dev` | asset watcher + `bun run --watch src/index.ts` (port `PORT` or 3000) | defined, not run here |
| `bun run build` | production CSS + browser JS into `public/assets/` | verified passing |
| `bun run build:prod` | `--compile --bytecode` single binary at `dist/idonthavespotify` | verified passing |
| `bun run build:workers` | edge bundle at `dist/workers.js` (fetch backend, console logger) | verified passing |
| `bun run typecheck` | `bun check` (self-host, browser journeys, and build tooling) + workers tsconfig | verified passing |
| `bun run typecheck:tsc` | TypeScript 7.0.2 cross-check for self-host, Worker, and e2e transport configurations | run when changing compiler configuration |
| `bun run test:e2e:list` | lists declared user journeys and targets without running them | see `docs/verification.md` |
| `bun run test:e2e` | builds assets and runs declarative desktop and phone-sized Chromium journeys | requires Node.js 24.8+ or 22.22.3+ on Node.js 22 |
| `bun run lint` | eslint over `src`, `tests`, `e2e`, and build/verification configuration | verified passing |
| `bun run test` | `NODE_ENV=test bun test` (offline via `HttpMock` + local snapshots) | verified passing |
| `bun run test:ci` | regenerates snapshots from live URLs, then tests | defined, not run here (needs network; snapshots are gitignored but present in a set-up tree) |

CI: PRs run `tests.yml` (loads `.env.test` into env, then `test:ci`, plus asset/binary/edge build, native-import audit, and binary smoke); pushes to `main` run `deploy.yml` (typecheck, lint, edge build + audit, `wrangler deploy`).

## Conventions and easy-to-miss constraints

- Import alias `~/*` maps to `./src/*` (see `tsconfig.json`); keep it in new imports.
- JSX is nano-jsx classic runtime (`jsxFactory Nano.h`); client controllers stay plain `.js`.
- htmx is pinned via a CDN script tag in `src/views/layouts/main.tsx`; Stimulus is bundled into `public/assets/index.js` by `build.config.ts`.
- `public/assets/*.js|css` are build artifacts and gitignored; never edit them, rebuild instead.
- `tests/mocks/**/*.html|json` are gitignored snapshots: if tests fail with missing-mock errors on a fresh clone, run `bun run test:mocks:fetch` (live network) before `bun run test`.
- Always run tests through `bun run test`, not bare `bun test`.
- The sample track (`SAMPLE_LINK` in `src/views/pages/home.tsx`) is always a Spotify URL, and the README screenshot (`docs/screenshot.png`) is always that sample track's result card. Change both together when the sample changes.
- Outbound HTTP must go through `HttpClient` so tests can stub it; no direct `fetch`/`impit` calls in adapters or parsers.
- Upstream error bodies must reach the logs: `HttpClientError` carries a 500-char `body` snippet, and adapters log it. Never swallow a non-2xx without its body.
- Tidal has no outbound adapter: its search API needs a portal-granted entitlement that was refused (`invalid_scope` on the token, `INVALID_RESOURCE_ID` on every query), and its search pages sit behind a bot wall. Tidal links resolve through the MusicBrainz fallback instead (`src/services/musicbrainz.ts`, polite UA plus ~1s pacing per its rate rules); do not re-add a Tidal adapter without portal access. For songs the fallback looks up `/ws/2/isrc/<isrc>?inc=url-rels` first, with the ISRC taken from the verified Deezer hit (`isrc` on `SearchResultLink` is internal and never reaches responses): title searches return an arbitrary slice of equal-score recordings (71 matches, 28 tied, for the sample track on 2026-10-01). The title search remains the backup, and its relation lookups stop after `MB_BUDGET_MS` (3 s).
- Env access is centralized in `src/config/env.ts` (a lazy proxy over edge bindings, `Bun.env`, and `process.env`); read new vars there, not inline. Never read `ENV` at module scope in `src`: the first read freezes the lazy cache, which breaks per-file test env assignments the same way `tests/utils/shared.ts` does. Read it per request instead. `DISABLE_API_SEARCH` enables API denial only when its trimmed, case-insensitive value is `true`. The public Worker's `[vars]` pins the string `"true"`; self-hosted API access stays open when it is absent. Retired email-login, Plunk, and beta API-key variables are no longer read.
- `tests/utils/shared.ts` reads `ENV` at module evaluation, freezing the lazy env cache for that test file. Files that set `process.env` per-file, such as `tests/public-instance.integration.test.ts`, must not import it; inline the endpoint builder instead.
- Production image (`Dockerfile`) ships the compiled binary with static assets embedded by `--asset ./public`; no separate `public/` copy is needed.
- `public/llms.txt` is a public contract read by external agents: any change to routes, auth, URLs, adapters, or response shapes must update it in the same commit as `API.md`/`README.md`. It rots silently because nothing executes it.
- Markdown voice rule: `.md` files guide a stranger, so they use full explanatory prose. Terse style stays in code, comments, commit messages, and PR text. Never write terse checklist-style markdown.

## Browser verification contract

User journeys are declared in `e2e/search.e2e.ts`; targets and evidence are configured in `e2e.config.ts`. Follow `docs/verification.md` before final verification. The yolo ladder is typecheck, lint, existing tests, asset/binary/Worker builds, then `bun run test:e2e`, followed by the remote required checks. The full browser gate must pass all declared journeys on both targets without skips or filters. Inspect the current command's exit status and `.e2e/report.json`; a stale report left by a setup failure is not acceptance evidence. Keep reports and traces under the ignored `.e2e/` directory.

The required browser gate uses no model and no production credentials. The e2e app runs with `--no-env-file`, explicit fixture configuration, and an alternate third-party HTTP backend selected by `e2e/tsconfig.json`. Do not stub internal modules or silently replace this with a live-provider test. Phone-sized Chromium does not establish iOS Safari coverage. Live upstream availability, audio, sharing, Cloudflare challenges, and Worker-runtime behavior are separate checks when relevant to the change.

## Workers operations (public instance only)

- Deploy is CI-owned (`deploy.yml` on push to `main`); the manual equivalent is `bun run build:workers` followed by `bunx wrangler deploy` from a logged-in account. `wrangler.toml` pins `nodejs_compat`, a compatibility date, Workers Assets for `public/`, and `DISABLE_API_SEARCH="true"` for the public instance. `v1` remains in migration history; `v2-remove-quota` deletes the retired `QuotaDO` class and its stored counters. There is no current Durable Object binding or exported class. Do not erase migration history or restore the old binding as a rollback: deleted data is not recoverable and a reintroduction needs a new migration plan.
- No email-provider secret controls API access. Obsolete email-login secrets are no longer read and can be removed separately by the operator. Change `DISABLE_API_SEARCH` explicitly if programmatic access should change; do not infer it from the presence of a provider credential.
- Every non-optional `readEnv` key in `src/config/env.ts` (base URLs, API keys, app IDs) must also exist as a Worker secret or var; a missing base URL makes that adapter request `undefined/...` on the edge. `APP_URL` must be the custom domain (`https://idonthavespotify.sjdonado.com`), never the `workers.dev` host, because share links are built from it. `bunx wrangler secret list` lists secret names only; non-secret variables belong under `[vars]` in `wrangler.toml`, so check both.
- GitHub deploy secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Edge deltas vs self-host: platform `fetch` instead of TLS impersonation (guarded sources may answer differently; Spotify metadata resolves via `__NEXT_DATA__` embed pages on both runtimes; Apple Music resolves via the same-host catalog chain with no audio preview), per-isolate in-memory cache (service-guard budgets stay the shared quota protection), no URL shortener (share links are always plain app URLs), no per-IP limiting in the app, and platform CPU and memory limits.
- Edge abuse protection is Bot Fight Mode plus one WAF Managed Challenge rule (the Free plan allows five custom rules; this deployment uses one), because only the edge can judge all isolates together. Create it under Security > WAF > custom rules:
  - Rule name: `idhs-search-challenge`
  - Expression: `(http.host eq "idonthavespotify.sjdonado.com" and http.request.uri.path in {"/search" "/api/search" "/verify"})` (host-scoped so other hostnames in the zone stay untouched)
  - Action: Managed Challenge (suspicious traffic faces an automatic challenge, interactive or not by signal; humans pass through)
  - `/` is deliberately not challenged, even though `?id=` share loads run full searches. Observed on iOS Safari (2026-09-30): after a challenged load of `/`, a reload following a search prompts to resubmit a form, and the resubmission reached the worker as `GET /` without `?id=` (seen in `wrangler tail`), so the page came back empty. A local reproduction with a POST-loaded page re-POSTed on reload after both `history.replaceState` and `pushState`, so switching the htmx URL header does not help.
  - `/verify` exists for flagged visitors: a challenge page cannot be solved inside an htmx request, so on a `cf-mitigated: challenge` response to `/search` the page navigates to `/verify?next=<current path>`. The WAF rule challenges that GET, and the route redirects back to the same-origin `next`, which keeps the history entry a plain GET. Before leaving, the page stores the typed link in `sessionStorage` (`idhs:resume-link`); on return to that same path within two minutes it refills the input and resubmits once. If that resumed search is challenged again, the page shows a toast instead of a second `/verify` trip; later searches on the page go through `/verify` normally.
- Share links load in two phases (`src/app.ts`, GET `/`). The page goes out after only the source metadata (non-Spotify sources also run the Spotify adapter to fill a missing cover or audio preview; the MusicBrainz fallback stays off there, because its title search could put a wrong recording's cover and preview in the meta tags), so link-preview crawlers get title, image, and `og:audio` without waiting for every service; an in-card loader then fetches `/?id=<id>&rows=1`, which runs the full search and returns only the rows. Both requests stay on `/`, outside the WAF rule. On the edge the second request may land on another isolate and refetch the source metadata (per-isolate cache); that cost is accepted.
- Floods die at the edge before consuming worker quota or subrequests; per-service circuit breakers stay the final fuse for upstream quotas. Keep Bot Fight Mode on (free) for known-bot junk, and tighten or add Under Attack Mode only as incident response.

## Public access decisions

The email wall and its unused implementation are removed. Browser search and shared links remain open; `DISABLE_API_SEARCH="true"` makes the public API return the existing 403 with `auth: "api-key"` before validation or upstream calls. That field is a compatibility hint, not an API-key implementation. Retired login endpoints still return 410 and `gate.enabled` stays false in status responses. API-key account UI and Plunk-based login belong to a separate future feature, not dormant source files. If abuse persists past the edge challenge, prefer a Turnstile widget on the search form rather than reviving the retired email wall.

## Spotify TOTP compatibility
- Spotify TOTP uses WebCrypto (`crypto.subtle` HMAC-SHA1), never `node:crypto`/`Buffer` in `generateTotp` (async). The decimal-concatenated secret quirk is preserved byte-identically and pinned by `tests/spotify-totp.test.ts` against a `node:crypto` reference.
