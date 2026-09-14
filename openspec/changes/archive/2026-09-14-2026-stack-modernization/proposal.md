## Why

The project still runs a 1.3-era Bun toolchain with a hand-rolled asset pipeline while Bun 1.4.2, htmx 2.0.10, Tailwind 4.3.x, and faster test runner flags are available. Two integrations (Umami analytics and the `bit` URL shortener sidecar) are no longer in use but still ship code, dependencies, config, and moving parts. This change modernizes the stack without touching search behavior, removes the dead integrations, and adds a Cloudflare Workers edge target alongside the existing self-host single binary.

## What Changes

- Upgrade runtime to Bun 1.4.2 and pin Docker and CI images to it (was floating `oven/bun:1`).
- Upgrade htmx 2.0.8 to 2.0.10, move the CDN script to jsDelivr, add a subresource integrity hash.
- Upgrade Tailwind to the current 4.3.x line; keep the official `@tailwindcss/cli` pipeline, run dev processes with `bun run --parallel`.
- Serve static assets with `Bun.serve` directory routes instead of the hand-rolled `/*` traversal handler; same URLs and status codes.
- Use `server.requestIP(req)` for client IP with header fallback; rate limit behavior unchanged on self-host.
- Embed frontend assets into the `--compile` single binary with `--minify --sourcemap=linked --bytecode`; Dockerfile stops shipping a separate `public/` copy next to the binary.
- Adopt `bun test --isolate` (and `--parallel` if measured faster) in CI.
- Align `tsconfig` with current Bun recommendations on the TypeScript 5.9/6 line; TypeScript 7 deferred until the 7.1 API and `typescript-eslint` support land.
- Remove Umami analytics entirely: server-side `@umami/node` tracking, client script tag, and client track call.
- **BREAKING**: Remove the URL shortener integration (`bit` sidecar, `shortenLink`, shortener cache helpers and env config). `universalLink` in API responses and the share button is now always the plain app URL (`APP_URL?id=...`) instead of a shortened URL.
- Add a Cloudflare Workers edge target (additive files only, default deploy path unchanged): Wrangler config, edge entry adapter, fetch-based HTTP backend switch (default stays `impit`), console logger shim, env binding mapping, Workers Assets for static files.
- Remove dead `DATABASE_PATH` config (in-memory cache is the only implementation; no sqlite import exists).

## Capabilities

### New Capabilities

- `deployment/single-binary`: the self-host single-file executable contract (what it serves, how it is built, how it is configured).
- `deployment/workers-edge`: the Cloudflare Workers public target contract, including documented edge deltas (fetch backend instead of `impit`, per-isolate state, no shortener, CPU and memory limits).
- `links/universal-link`: the unshortened universal share link contract for web UI and API responses.
- `privacy/no-analytics`: the system ships and emits no analytics tracking, server or client.

### Modified Capabilities

- None (no existing specs under `openspec/specs/`).

## Impact

- Code: `src/index.ts` (routes, IP, dev mode), `src/views/layouts/main.tsx` (htmx CDN, remove analytics script and `isProduction` prop), `src/views/controllers/search_controller.js` (remove tracker), `src/services/search.ts` (no shortening), `src/utils/url-shortener.ts` and `src/services/umami.ts` (deleted), `src/services/cache.ts` (drop shortener helpers), `src/config/env.ts` (drop `urlShortener`, `umami`, `databasePath`), build scripts, Dockerfile, `docker-compose.yml` (drop `bit` service), tests and mocks, README and API docs wording.
- Dependencies: drop `@umami/node`; bump Bun, Tailwind, htmx, and minor deps.
- Systems: Dokku deploy path unchanged; new optional Wrangler deploy path for the edge target. Operators must drop `URL_SHORTENER_*` and `UMAMI_*` vars and the `bit` sidecar (unused vars are simply ignored).
