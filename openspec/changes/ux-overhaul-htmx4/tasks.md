## 1. Slice 1 — htmx 4 transport + gate email on fragments

- [x] 1.1 Pin htmx 4.0.0 in `main.tsx` with the verified SRI hash; confirm `hx-indicator` against the v4 DOM
- [x] 1.2 Migrate `home.tsx` `hx-request` to `hx-config` (6 s timeout); audit attribute inheritance (no `:inherited` expected)
- [x] 1.3 Rename events in `search_controller.js` (`after:swap`), delete the global error-toast listener
- [x] 1.4 Return HTML error fragments for web-flow gate 4xx (form re-rendered, values retained, status preserved); freeze JSON branches
- [x] 1.5 Update web-flow gate tests to HTML assertions; ladder green; human try-it

## 2. Slice 2 — stepped gate flow

- [x] 2.1 Server-render stepped states idle/sending/sent/verifying/verified with inline errors
- [x] 2.2 Composed mobile-first gate panel per step (heading, guidance, 44 px targets, no scroll at 360 px)
- [x] 2.3 Autofocus plus `aria-live=polite` step/error announcements
- [x] 2.4 6-box code input (auto-advance, paste-split, numeric keyboard, six-digit submit)
- [x] 2.5 Resend countdown ticking to zero on throttled sends
- [x] 2.2 Resend countdown with remaining-wait messaging
- [x] 2.3 6-box code input (auto-advance, paste-split, numeric keyboard, six-digit submit)
- [x] 2.4 Verified confirmation revealing search; ladder green; human try-it

## 3. Slice 3 — search fragments, toaster, mobile polish

- [x] 3.1 Decide URL update mechanism (OOB vs `hx-partial` vs push/replace headers); `/search` 400/401/429 as HTML fragments
- [x] 3.2 First-party confirmations-only toaster; remove Notyf; failures never toast
- [x] 3.3 Accessible viewport, phone-first result cards, skeleton loaders for search waits, `prefers-reduced-motion` static fallbacks
- [x] 3.4 Update invalid-link and quota web tests to HTML; JSON API tests untouched; ladder green; human try-it
- [x] 3.5 Verify performance budgets per slice (server p50 parity, JS weight at/under baseline, no new blocking third parties)

## 4. Release

- [x] 4.1 Bump `package.json` to 1.9.0
- [x] 4.2 One line in `API.md` on web-flow fragment behavior (JSON contract frozen)
- [x] 4.3 Finalize requirements ledger for the `yolo` handoff (no push, no PR from proto)

## 5. Slice 4 — modal gate, hero layout, try-it

- [x] 5.1 Gate in a native blocking `<dialog>` (centered card, dimmed backdrop, Escape vetoed, stacked full-width steps)
- [x] 5.2 Hero/results container class with submit-time flip; server renders the class from result presence
- [x] 5.3 Sample-track button running a real search on a hardcoded link
- [x] 5.4 Ladder green, updated tests, human try-it with screenshot

## 6. Slice 5 — consistency pass from taste feedback

- [x] 6.1 Rebase onto `origin/master` (#83–#85: footer status link, og:url, demo URL) with zero conflicts left
- [x] 6.2 Shared button styles (`button.ts`) adopted by every action; sample button hero-only
- [x] 6.3 Circular audio progress ring replacing the bottom bar
- [x] 6.4 Ladder green, budgets re-verified, human try-it with screenshot

## 7. Slice 6 — modal footer and welcome

- [x] 7.1 Welcome eyebrow plus always-visible mini-footer (Source, version) inside the gate card
- [x] 7.2 Lazy env reads in fragments (module-scope `ENV` froze test env); AGENTS.md guard line

## 8. Slice 7 — compact result grid

- [x] 8.1 Platform links as a 2-col (3 on desktop) tile grid with short names, per-tile copy, clamped title/description
- [x] 8.2 Ladder green, human try-it with screenshot

## 9. Slice 8 — modal footer and card heights

- [x] 9.1 Shared `FooterContent` in page footer and gate modal; links gray in both; Welcome in title voice
- [x] 9.2 Preview circle and share back to compact height in the new style

## 10. Slice 9 — one-line footer

- [x] 10.1 Single-row shared footer (version, Source, Spooky), subtitle gray, byline removed, wider dialog

## 11. Slice 10 — sample polish, em dashes, Zen link

- [x] 11.1 Sample button hover removed (ghost style has no hover state now)
- [x] 11.2 Em dashes removed from modal copy
- [x] 11.3 Send (leaf, zen.donado.co) link in the shared footer

## 12. Slice 11 — public instance rename

- [x] 12.1 User-facing copy off "demo" (modal, gate/quota/policy messages); docs, `llms.txt` examples, main specs match
- [x] 12.2 Code identifiers (`DEMO_URL`, WAF rule, change dir) intentionally untouched

## 13. Slice 12 — footer ghost and card void

- [x] 13.1 Card hugs content (forced min-height removed)
- [x] 13.2 Page footer hidden while the modal owns the screen (kills the blurred double-footer ghost)
- [x] 13.3 Root min-height so the footer rests at the viewport bottom on short pages

## 14. Yolo run to PR

- [x] 14.1 Verify cascade-layer fix in a live browser (compact/`has-results` wins, skeleton shows)
- [x] 14.2 Verify sample-track click runs a real search in a live browser
- [x] 14.3 Drop the unused `notyf` dependency (package.json + lockfile)
- [x] 14.4 Archive `demo-abuse-protection` (verify, sync specs, archive)
- [x] 14.5 Adversarial review round, triage findings in the tree
- [x] 14.6 Squash to one commit, push, open PR, drive all checks green
