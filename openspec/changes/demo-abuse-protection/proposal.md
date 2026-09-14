## Why

The public Workers demo is live but two outbound adapters are dead on edge (Spotify: `createHmac2 is not a function` from the bundled `node:crypto` shim, proven in worker logs; Tidal: search returns HTTP 400, cause unknown), CI still deploys to Dokku instead of the live target, docs are terse where they should guide, and abuse protection rests on one WAF rule alone with no identity layer.

## What Changes

- Fix Spotify's TOTP HMAC via WebCrypto (`crypto.subtle`, universal across Bun/Node/Workers) so the anonymous token flow works on edge; drop the `node:crypto` import.
- Diagnose the Tidal v2 search 400 (compare self-host vs edge with identical query, log upstream error bodies) and fix the query or document it as a demo gap like Apple Music was.
- Gate demo usage behind email OTP via Plunk: inline flow (type email, receive code, enter code), session cookie as the only credential (no API tokens); required unless disabled via env; email used only for abuse prevention.
- Email policy: allowlisted popular providers only, no plus-aliases, Plunk `/v1/verify` as backstop for disposables/typos.
- Replace the Dokku deploy workflow with a Cloudflare Workers deploy (wrangler, OIDC or API-token secret); Dokku is gone entirely (workflow, docs mentions, instance) — binary/Docker remains the self-host path.
- Rewrite README as full guiding prose (terse style stays out of `.md` files); move Workers operational detail into AGENTS.md.
- Rate limit decision: per-email search quota (6 searches per rolling 4 min, 2-min cooldown past it) in a Durable Object keyed by email hash — the identity key makes the counter small and abuse-meaningful, unlike the rejected global IP counter. WAF rule and service guards stay as outer layers.
- **BREAKING** (opt-in surface): unauthenticated search becomes 401-gated when the gate is enabled; verified identities get 6 searches per rolling 4 min with a 2-min cooldown past it.

## Capabilities

### New Capabilities

- `search/edge-adapter-parity`: Spotify and Tidal adapters must work from Workers egress.
- `abuse/email-otp-gate`: email OTP gate (Plunk, stateless codes, provider/alias policy, web + API auth shapes, env kill-switch).
- `deployment/workers-ci`: GitHub Actions deploys to Cloudflare Workers on push to master.

### Modified Capabilities

- None (docs reshuffle changes no spec-level behavior; the gate is new).

## Impact

- Code: `src/adapters/spotify.ts` (WebCrypto TOTP), `src/adapters/tidal.ts` (pending diagnosis), new `src/abuse/` (gate, Plunk client, stateless OTP, provider list), `src/app.ts` + `src/workers.ts` (gate wiring), `src/views` (inline OTP UI, no signup page), tests, `.github/workflows/deploy.yml` (wrangler), README, AGENTS.md.
- Operator setup: Plunk secret key + verified sender domain, `PLUNK_*` bindings/secrets, session secret, GitHub `CLOUDFLARE_API_TOKEN` (+ account ID) secrets, Wrangler already configured.
- Self-host: gate defaults off unless env enables it; binary path unchanged.
