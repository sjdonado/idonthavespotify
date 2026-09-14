## Why

The prime goal of this change is to make this web app first-class in performance, UI, and UX: a phone on a chat link should get a fast, beautiful, obviously-guided experience with zero dead ends. Today it does not: errors arrive as toast popups detached from the form that caused them, the email gate is bare unstyled text with no progress, focus, or retry guidance, the mobile layout is an afterthought, and nothing pins the performance bar. The transport upgrade serves that goal; it is not the goal. The server already does the heavy lifting; the web layer should present its answers (including its rejections) where the user is looking, fast.

## What Changes

- Web-flow errors become inline HTML fragments: `POST /search` 400/401/429 and the gate endpoints return swappable error markup with the original status code, so the message renders where the action happened and the form survives with its value intact. JSON API shapes (`/api/*`, `wantsJson` clients) are frozen.
- Upgrade the frontend transport to htmx 4.0.0 (pinned CDN + SRI), which swaps error responses by default and gives per-status targeting: migrate `hx-request` to `hx-config`, rename lifecycle events to the `htmx:phase:action` form, drop the global error-toast listener, audit attribute inheritance.
- Stepped email-gate flow rebuilt as a first-class component inside a centered blocking modal (industry Clerk-style pattern: card, heading, stacked full-width input and action, footer note): idle to sending to sent to verifying to verified, with inline errors, a resend countdown, a 6-box code input (paste-split, numeric keyboard), autofocus and screen-reader announcements. The app behind is visibly blocked until verification completes.
- Home follows the Google pattern: title and search centered as a hero on landing; a compact top header once a result (or error) is present. A "try a sample track" button runs a search on a hardcoded song link for users with no link at hand.
- Feedback discipline: toasts confirm only (copied, verified); a ~30-line custom toaster replaces Notyf.
- Phone-first polish: fix the viewport (`user-scalable=no` goes), phone-first result cards, skeleton loaders instead of the spinner, motion that respects `prefers-reduced-motion`.
- Performance budgets pinned: no heavier than the 1.8.3 baseline (server latency parity, first-party JS weight capped, no new render-blocking third parties).
- Release marker: bump `package.json` to 1.9.0.

## Capabilities

### New Capabilities

- `search/error-fragments`: web-flow search and gate errors swap inline as HTML fragments with status preserved; JSON API contract unchanged; toasts reserved for confirmations.
- `gate/stepped-verification`: stepped OTP states, inline errors, resend countdown, 6-box code input with paste-split and numeric keyboard.
- `ux/confirmation-toasts`: custom confirmations-only toaster replacing Notyf (copied, verified, quota).
- `ux/mobile-search`: accessible viewport, phone-first result cards, skeleton loaders for search waits, motion that respects `prefers-reduced-motion`.
- `ux/home-layout`: centered hero landing, compact results header, sample-track try-it button. Identity (black, green accent, Poppins, terse copy) is preserved; simple stays elegant.
- `ux/performance-budget`: server latency parity with the 1.8.3 baseline, capped first-party JS weight, no new render-blocking third parties.

### Modified Capabilities

- None (the `?id=` URL update keeps its requirement; only the mechanism may change, which is design. API error shapes are frozen, not modified).

## Impact

- Code: `src/views/layouts/main.tsx` (htmx 4.0.0 pin + SRI, viewport), `src/views/pages/home.tsx` (`hx-config` timeout), `src/views/controllers/search_controller.js` (event renames, toast listener removal), `src/views/controllers/helpers.js` (Notyf out, custom toaster in), `src/views/components/gate.tsx` + `src/abuse/routes.ts` (stepped flow, error fragments), `src/app.ts` + `src/abuse/gate.ts` (HTML fragment variants for web-flow 4xx), `src/views/components/` (skeletons, cards), `package.json` (1.9.0).
- Tests: invalid-link and gate web-flow assertions move from JSON/bare-text to HTML fragments; JSON API tests stay green untouched.
- Docs: one line in `API.md` on web-flow fragment behavior.
- Self-host: no env or operator changes; gate defaults unchanged.
