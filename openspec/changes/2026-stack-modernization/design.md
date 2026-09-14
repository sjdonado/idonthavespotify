## Context

See proposal.md for motivation. Current state: Bun 1.3-era toolchain, `Bun.serve` routes with a hand-rolled `/*` static handler, nano-jsx SSR strings for pages, Stimulus plus htmx 2.0.8 via `unpkg` on the client, Tailwind via `@tailwindcss/cli` spawned from `build.config.ts` alongside a `bun build` watcher and `bun run --watch`, `bun test` serial, TypeScript 5.9 with `typescript-eslint`, `impit` for outbound HTTP, `pino` plus `pino-pretty` for logs, `@umami/node` plus client tracker, `bit` sidecar shortener via `shortenLink`, in-memory cache and rate limiter, Dokku deploy. Constraints: zero search-behavior change, one PR, `.env` values never read, Dokku path keeps working.

## Goals / Non-Goals

**Goals:**

- 2026 toolchain (Bun 1.4.2, htmx 2.0.10, Tailwind 4.3.x) with identical user-visible behavior.
- Delete Umami and the shortener end to end, including tests and docs.
- One binary for self-host plus an additive, default-off Workers target from shared route code.

**Non-Goals:**

- htmx 4 migration (deferred; breaking for our event and attribute usage).
- TypeScript 7 adoption (deferred; blocked on 7.1 API and `typescript-eslint`).
- New search features, adapter changes, or ranking tweaks.
- Shared cross-isolate state on the edge (KV/D1) beyond documented per-isolate memory state.

## Decisions

- **Tailwind: keep `@tailwindcss/cli`, reject `bun-plugin-tailwind`.** The plugin is not properly published or maintained, pins an old engine, and pulls all-platform binaries; an open Bun docs proposal recommends the CLI. Modernize the invocation instead: `bun run --parallel` supervisor plus `--watch=always` for the CSS watcher.
- **htmx: 2.0.10 on jsDelivr with SRI; v4 deferred.** 2.0.10 is a transparent patch-line bump. v4 is breaking for us (`hx-request` removed, XHR event details gone while `search_controller.js` reads them, explicit `:inherited` audit, 4xx/5xx swap by default) and the vendor keeps 2.x supported with 4.x on the `next` tag into 2027. Flip condition: a dedicated v4 spike driven by the official `upgrade-check` tool goes green.
- **TypeScript: stay on the 5.9/6 line, align `tsconfig` with Bun's current recommendations (`moduleResolution bundler`, `module Preserve`).** TS 7 has no API until 7.1 and `typescript-eslint` crashes on it; the vendor workaround is side-by-side TS 6 for lint, which is not worth the complexity inside this PR.
- **Static: `Bun.serve` directory routes on self-host; explicit `with { type: "file" }` imports wrapped in `new Response(blob)` for binary-embedded assets; Workers Assets on edge.** Directory routes subsume the manual traversal code with kernel-clamped paths on Linux. Explicit file imports are preferred over `--asset` directory embedding after a credible startup-crash report for `routes[].dir` over embedded `$bunfs` paths.
- **IP: `server.requestIP(req)` first, header parsing as fallback, `CF-Connecting-IP` honored in the edge entry only.** Same limiter math everywhere.
- **Server reload: keep `--watch` (hard restart) for the server process.** `--hot` persists `globalThis`, which would let cache, limiter, and circuit state leak across reloads and diverge from production. Browser HMR applies to frontend assets only.
- **HTTP backend switch defaulting to `impit`.** Self-host keeps TLS impersonation byte for byte; the edge entry selects the platform `fetch` backend at build time. Documented consequence: guarded sources may answer differently on edge.
- **Logger behind the existing call shape: `pino` on self-host, console shim on edge.** `pino` transports are unsupported on Workers; analytics calls are deleted, not shimmed.
- **Removal semantics: `universalLink` stays as a field, value becomes the plain app URL.** Preserves the API and share-button contract shape while deleting the third-party call. `DATABASE_PATH` is deleted as dead config (no sqlite import exists).
- **Single PR as stacked commits, each green on the full ladder.** Order: pins and safe bumps, config alignment, dev scripts, server routes, dual-target seams (defaults preserve behavior), binary flags plus Dockerfile, Workers additive files, test flags plus CI.

## Risks / Trade-offs

- [Risk] `impit` prebuilt native addon versus Bun 1.4's Node 26 module version → Mitigation: verify on the first 1.4.2 build; rebuild or pin `impit` if the prebuild mismatches.
- [Risk] `--target=cloudflare` exists as a PR but is absent from released bundler docs → Mitigation: use docs-supported `--target=browser` plus `nodejs_compat` and only switch if the pinned toolchain proves the flag exists.
- [Risk] One large PR is harder to review → Mitigation: stacked logical commits, no business-logic diffs, ladder output and DevTools screenshots attached per the verification plan.
- [Risk] musl versus glibc binary against the `alpine` runtime stage → Mitigation: CI boots the built binary and curls every route; switch compile target or runtime stage on failure.
- [Risk] Edge per-isolate state weakens global rate limiting → Mitigation: Cloudflare rate limiting rules in front plus tighter edge limiter constants, documented as a deploy requirement.
- [Risk] Small test suite may run slower under `--parallel` worker-spawn cost → Mitigation: measure serial versus `--isolate` versus `--parallel` and lock in the fastest green option.

## Migration Plan

- Deploy: merge the single PR; Dokku flow unchanged. Operators drop the `bit` service and shortener plus analytics env vars (unset values are ignored, so this is non-urgent). New optional Wrangler path documented separately.
- Rollback: revert the single PR; previous binary and compose stack keep working, shortened historical links already issued continue to resolve through the shortener only if operators keep it running during transition.

## Open Questions

- Free versus paid Workers tier for the public instance (affects CPU limits and which abuse controls are available, not the specs or task breakdown).
