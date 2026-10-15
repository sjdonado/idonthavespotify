# Browser verification for agents

The project uses https://github.com/tester-army/e2e to declare user journeys in `e2e/search.e2e.ts`. `e2e.config.ts` selects the journeys, desktop and phone-sized Chromium targets, timeouts, and evidence reporters. Tests use locators and exact assertions rather than model judgments, so the required gate needs no AI subscription, API key, or model calls.

## Run the gate

Install dependencies with Bun 1.4.3 or newer. The e2e runner requires Node.js 24.8 or newer, or Node.js 22.22.3 or newer on the 22.x line. Bun runs the app, not the e2e runner.

```sh
bun install
bun run test:e2e:list
bun run test:e2e
```

The run builds browser assets, installs the pinned Chromium browser if needed, starts a separate app process for each target on a free loopback port, and stops those processes on exit. It does not reuse a developer's running app. Telemetry is disabled by the package scripts.

## Declared journeys

| Journey | Decisions verified |
| --- | --- |
| Sample conversion and universal-link reload | The sample shortcut submits a Spotify track, matching destination links render with the expected URLs and verification labels, the page adopts a universal URL, and reloading completes the two-phase shared-card load. |
| Invalid link on the landing page | A search error appears as a toast without replacing the landing page or its sample shortcut. |
| Invalid link after a successful result | A failed search preserves the previous result and universal URL. |

Every journey runs at both 1440 × 900 and 390 × 844. The phone-sized target checks responsive Chromium behavior, not iOS Safari or a real device.

## Isolation and coverage limits

`e2e/tsconfig.json` replaces only the third-party HTTP backend with `e2e/http-backend.ts`. The app's HTTP client, parsers, adapters, matching rules, cache, routes, HTML components, htmx, and Stimulus controllers remain real. Spotify embed, Deezer, and YouTube responses are fixed fixtures; the remaining destinations return a controlled no-match response. No app request reaches a music provider. The browser receives the same integrity-checked htmx 4.0.0 script from the installed package; external fonts and icons are replaced with empty stylesheets.

The app process uses `--no-env-file` and explicit non-secret fixture configuration. The runner loads no environment file. Do not add production credentials to this gate. Fixtures do not prove live provider availability, every parser's response shape, native TLS impersonation, audio playback, clipboard or native sharing, Cloudflare challenge enforcement, or the deployed Worker runtime. Existing parser and API tests remain required, and a relevant live or edge check must be reported separately when a change touches those boundaries.

## Final yolo verification

Agents must run the repository ladder in order: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, `bun run build:prod`, `bun run build:workers`, then `bun run test:e2e`. The full browser gate is required even when a focused journey was used during development. A missing browser, unsupported Node.js version, skipped journey, or failed attempt is incomplete verification, not a pass. Do not weaken an assertion to make a run green.

The canonical result is `.e2e/report.json`. `.e2e/summary.md` and `.e2e/junit.xml` provide human and CI summaries; `.e2e/results/` retains each journey's step trace and failure artifacts. Before reporting the gate as green, confirm the report belongs to the current run, all six target/journey combinations passed, and none were skipped or filtered. A setup failure can leave the previous report untouched, so a prior successful report never overrides the current command's exit status.

For a new behavior, add a journey named after the user decision and assert its visible outcome through the real app. Stub a new third-party boundary in the fixture backend only when necessary; never mock internal search, parser, cache, or view modules. Agent-driven natural-language steps can be added later with an explicitly selected model, but they are not required for this deterministic gate.

## Toolchain checks

`bun run typecheck` uses Bun 1.4.3's native checker for the self-host, Worker, and e2e transport configurations, including build and verification tooling. `bun run typecheck:tsc` runs TypeScript 7.0.2 as a compatibility cross-check when changing compiler configuration. The `@typescript/native` alias supplies TypeScript 7's `tsc`; the `typescript` alias supplies Microsoft's TypeScript 6 API compatibility package for ESLint, which cannot consume TypeScript 7.0's API. Remove the compatibility alias only when the ESLint parser supports the native API.
