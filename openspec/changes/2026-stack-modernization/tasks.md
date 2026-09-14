## 1. Toolchain pins and safe bumps

- [x] 1.1 Pin Bun 1.4.2 in Dockerfile, CI setup action, and docs; verify `impit` prebuild loads on first build
- [x] 1.2 Upgrade Tailwind to current 4.3.x line and take safe minor dep bumps; confirm CSS output unchanged
- [x] 1.3 Move htmx to 2.0.10 on jsDelivr with SRI hash in `main.tsx`; confirm no markup or JS changes needed

## 2. Config alignment and dead-code removal

- [x] 2.1 Align `tsconfig` with Bun recommendations without taking TypeScript 7; keep `tsc --noEmit` and `eslint` green
- [x] 2.2 Delete Umami: service file, dep, env block, server track call, layout script tag plus `isProduction` prop, controller tracker
- [x] 2.3 Delete shortener: util file, `shortenLink` calls (plain `APP_URL?id=` link), cache helpers, env block, `bit` compose service, README section
- [x] 2.4 Delete dead `DATABASE_PATH` config; update tests and mocks that stub shortening

## 3. Dev scripts and asset pipeline

- [x] 3.1 Replace `&` dev backgrounding with `bun run --parallel`; fix CSS watcher invocation
- [x] 3.2 Prove dev parity: identical pages, hashed assets, HMR on client asset edits, server `--watch` restarts

## 4. Server modernization

- [x] 4.1 Replace hand-rolled `/*` static handler with directory routes; keep URLs, 404s, and traversal rejection
- [x] 4.2 Adopt `server.requestIP` with header fallback; confirm rate limit headers unchanged
- [x] 4.3 Set `development` object config and review idle timeout; confirm API and fragment responses byte-identical

Deviation recorded: kept boolean `development` (object form only affects HTML-import routes, which this SSR app does not use); traversal rejections now return 404 instead of 400 (untested, undocumented surface).

## 5. Dual-target seams (defaults preserve behavior)

- [x] 5.1 Add HTTP backend switch defaulting to `impit`; add console logger shim behind existing call shape
- [x] 5.2 Map Workers `env` bindings to config in the edge entry only; self-host still reads process env (moves to group 7 with `workers.ts`)

## 6. Single binary and self-host image

- [x] 6.1 Embed frontend assets and build with minify, linked sourcemaps, bytecode; drop `public/` copy from runtime image
- [x] 6.2 Resolve musl versus glibc target for the Alpine stage; CI boots the binary and curls every route

Deviations recorded: `--bytecode` dropped (Bun 1.4.2 rejects it alongside top-level await; spec amended); explicit per-file static routes replaced the `dir` route after probes showed `$bunfs` layout (`import.meta.dir` is `/$bunfs/root` in-binary vs `src/` in dev) and `with { type: 'file' }` does not apply to code-loader extensions at runtime; favicon path corrected to `/assets/favicon.ico`. musl/CI proof becomes a `binary-smoke` CI job (this task) since compile happens in the Alpine builder by construction.

## 7. Workers edge target (additive)

- [x] 7.1 Add Wrangler config, edge entry adapter, and Workers Assets wiring; verify bundle builds with browser target
- [x] 7.2 Deploy to a preview worker and run the parity smoke plus documented edge deltas and abuse controls

Deviation recorded: no Cloudflare credentials in this environment, so 7.2 was substituted with a stock-Node boot of the edge bundle (status/landing/404/API-400 all parity-correct) plus banned-import audit; real preview deploy is a user step (`wrangler deploy`, documented in README).

## 8. Tests, verification, and docs

- [x] 8.1 Add pinning tests: static assets and traversal, service-guard status, layout script and asset tags
- [x] 8.2 Measure serial versus `--isolate` versus `--parallel`; lock in the fastest green flags in CI
- [x] 8.3 Run the Chrome DevTools MCP manual protocol on dev server and binary (snapshot, screenshots desktop and mobile, network 200s, invalid-link toast and 400 shape, zero console errors) and attach evidence to the PR
- [x] 8.4 Update README, API wording for unshortened links, and Workers deploy docs; record decisions with flip conditions
- [x] 8.5 Document the demo-only Cloudflare rate limiting rule (expression, threshold, action, self-host skip) in README and the edge spec
- [x] 8.6 Remove the in-app per-IP limiter entirely (config, middleware, error component, wrappers, headers, status fields); keep service guards; rewrite API/llms/README rate docs; self-host warning instead of limits
- [x] 8.7 Spotify oEmbed metadata fallback (edge bot-wall recovery; fallback-only, self-host path untouched) plus parser tests; live-verified on the deployed worker

Deviation recorded: all three test modes run in ~0.25s (suite too small to differentiate); locked `--isolate` for per-file hygiene at zero cost.
