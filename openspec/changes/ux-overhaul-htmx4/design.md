## Context

See proposal.md Why. Today the server speaks two dialects: HTML fragments on success, JSON `{message}`/`{error}` or bare text on 4xx, sniffed by one global `htmx:error` toast listener. htmx 2 never swaps 4xx/5xx bodies, so error content never reaches the target. htmx 4.0.0 (stable 2026-08-28, verified against four.htmx.org docs and release notes) swaps every response except 204/304, which makes the inline-error contract native instead of hand-built.

## Goals / Non-Goals

**Goals:** one error protocol (fragments inline, toasts for confirmations), htmx 4 transport, stepped gate, phone-first polish, 1.9.0 marker.

**Non-Goals:** upstream adapter behavior, quota windows, OTP crypto, URL-shortener or analytics (already removed), edge/WAF changes, any JSON API shape change.

## Decisions

- **Upgrade to htmx 4.0.0, don't switch frameworks.** v4 natively implements the error-fragment contract (swap-all + `hx-status` per-status targeting). Alternatives rejected: Turbo (heavier, same server work anyway), hand-rolled fetch helper (re-implements what v4 ships). Explicitly: the transport is plumbing in service of the mobile-first experience, not the deliverable; slices are ordered so the visible payoff lands from slice 1's gate errors onward.
- **Pin `https://cdn.jsdelivr.net/npm/htmx.org@4.0.0/dist/htmx.min.js` with SRI `sha384-BvJpBiO8Kh31EqtJe5DRIeWrHWnCGkwytKs9NKFi86Hhw96dEqdEMzZDeK9iEGTc`.** Verified byte-identical on jsDelivr and unpkg across refetches; pinned full-version paths are static so SRI is safe. (2.x stays npm `latest`, 4.x on `next` until ~2027; the pin makes that irrelevant.)
- **`hx-request` becomes `hx-config`.** `hx-request` is removed in v4; the 6 s search timeout moves to `hx-config`. v4's 60 s `defaultTimeout` never applies to search.
- **Event renames ship at pin-flip time.** `htmx:afterSwap` to `htmx:after:swap` (keeps the `?id=` replaceState hack working until slice 3 redesigns it); the global toast listener is deleted because `event.detail.errorInfo.xhr` dies with XHR and fragments replace its job. `HX-Refresh` is unchanged in v4 and stays for slice 1.
- **Fragment shapes per path:** invalid link to error fragment in `#search-results` (form lives outside the target, so its value survives); 401 to a verify-prompt fragment; 429 to a retry-after fragment keeping `Retry-After`; 500 keeps its existing HTML (v4 swaps it for free); gate 4xx re-render the originating form with values retained plus a styled inline error. Identity/quota helpers gain HTML variants for web flow; `wantsJson` branches are untouched.
- **Toasts confirm only.** Success confirmations (copied, verified) keep toasts via a ~30-line first-party toaster; every failure renders inline. Notyf is removed.
- **Stepped gate as server-rendered states** (idle/sending/sent/verifying/verified) with resend countdown and a 6-box code input (auto-advance, paste-split, `inputmode=numeric`), no new client framework. The panel is a composed component at every step: heading plus guidance plus input plus primary action, autofocus on arrival, `aria-live=polite` announcements, 44 px targets — the current bare-text layout is the explicit before picture.
- **Mobile-first component bar.** Phone layout first at 360 px, no horizontal scrolling anywhere in the flow; result cards re-set with readable type and thumb-sized actions; skeletons mirror card shape; all motion has a `prefers-reduced-motion` static fallback. No new CSS framework: Tailwind stays, one small component layer on top.
- **Performance budgets enforced at the end of every slice.** Baselines from 1.8.3 (loopback p50s, 95 KB first-party JS min): server renders stay sub-millisecond, JS weight never grows (Notyf leaves, toaster is ~30 lines), zero new render-blocking third parties. A slice that misses its budget does not ship to try-it until it is back under.
- **Gate lives in a fixed overlay, not a top-layer dialog.** A `<dialog>` with `showModal()` ignores z-index, which made the required single always-visible footer impossible. Plain fixed layers (backdrop, card, footer at ascending z-index) give the same blocking shape with zero dependencies. Known limitation, accepted for the prototype: keyboard focus is not trapped (the only tabbables behind the gate are footer links); a trap is yolo hardening if it earns its weight.
- **Hero/results as one container class.** `#home-main` carries `home-hero` or `has-results`; CSS owns the difference (centering, title scale). A submit action flips the class before the request so the skeleton lands under the compact header. Server renders the class from result presence, so shared links and reloads are always correct with no client state.
- **Try-it as a real search.** The sample button fills the input with a hardcoded track link and submits the same form — no special endpoint, no parallel path.
- **Release as 1.9.0** (minor: user-facing behavior additions, no breaking API change).

## Risks / Trade-offs

- [Pin on the `next` line] → Mitigation: exact-version pin + verified SRI; 2.x LTS means fallback is one revert.
- [v4 swaps 500 HTML into targets] → Mitigation: existing 500 bodies are already safe generic fragments; no work.
- [`hx-indicator` under v4] → Mitigation: verify at build with one DOM check; low risk.
- [Test churn on web error bodies] → Mitigation: JSON API tests untouched; only web-flow assertions move to HTML.
- [Slice 1 looks like nothing changed] → Mitigation: gate inline errors plus toast removal are the visible proof; if try-it feels empty, fold slice 2 forward.
- [Polish costs speed] → Mitigation: budgets are spec requirements checked per slice, not aspirations; the toaster swap and skeleton CSS are the only asset deltas and both must net out at or under baseline weight.

## Migration Plan

- Slice 1: pin + SRI, `hx-config`, event renames, gate email form on fragments, ladder green, human try-it.
- Slice 2: full stepped gate flow, human try-it.
- Slice 3: search fragments + toaster + mobile polish, human try-it.
- Then finalize the ledger, `yolo` run, PR. Nothing pushes or merges from proto; deploy stays CI-owned.

## Open Questions

- URL update mechanism (OOB vs `hx-partial` vs push/replace headers), decided in slice 3. Changes neither specs nor the slice 1/2 breakdown.
