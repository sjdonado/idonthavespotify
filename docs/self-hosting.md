# Running and operating IDHS

## Local configuration

Use Bun 1.4.3 or newer. Create a local `.env` in the project root and set the variables below. Never commit credentials. The app reads configuration through `src/config/env.ts`; it does not require a Spotify developer account.

| Variables | Purpose |
| --- | --- |
| `APP_URL`, `PORT`, `NODE_ENV` | Set the app's public origin, listening port (3000 by default), and runtime mode. Use `http://localhost:3000` for local development. |
| `DISABLE_API_SEARCH` | Set to `true` to return 403 from `/api/search` before validation or upstream calls. Leave unset to keep self-hosted API access open. Browser search and shared links remain open either way. |
| `SPOTIFY_API_URL`, `SPOTIFY_BASE_URL` | Configure the Spotify web-player endpoints. |
| `YOUTUBE_API_URL`, `YOUTUBE_MUSIC_BASE_URL`, `YOUTUBE_API_KEY` | Configure YouTube search and result links. Obtain the key from https://console.developers.google.com/. |
| `DEEZER_API_URL`, `APPLE_MUSIC_API_URL`, `SOUNDCLOUD_BASE_URL` | Configure the corresponding search endpoints. |
| `QOBUZ_API_URL`, `QOBUZ_APP_ID`, `QOBUZ_STREAM_URL`, `QOBUZ_STORE_URL` | Configure Qobuz search and result links. |
| `BANDCAMP_API_URL`, `BANDCAMP_BASE_URL`, `PANDORA_API_URL`, `JIOSAAVN_API_URL`, `ITUNES_API_URL` | Configure the remaining destination endpoints. |

The checked-in environment template is `.env.test`. Use its endpoint settings when configuring an instance, but supply your own credentials. The app no longer reads the retired email-login or Plunk settings, and they do not control API access. There is no API-key authentication implementation.

```sh
bun install
bun run dev
```

Open http://localhost:3000. The development command watches both server code and browser assets.

## Compiled binary

Build browser assets before the binary so they are embedded with the server. The compiled executable serves pages, API responses, and static assets without a separate `public/` directory.

```sh
bun run build
bun run build:prod
./dist/idonthavespotify
```

The executable reads `.env` from its working directory. Set `NODE_ENV=production` for production use and `PORT` to change its listening port.

## Docker

The Dockerfile builds with Bun 1.4.3 and copies the standalone executable into the runtime image. Pass your configuration when starting the container.

Before building, exclude `.env` and `.env.*` from the Docker build context. The current `.dockerignore` excludes only the local variants, so do not run the build below with other environment-secret files present in the context. Supply runtime credentials through `--env-file`, not through image layers.

```sh
docker build -t idonthavespotify .
docker run --rm -p 3000:3000 --env-file .env idonthavespotify
```

Self-hosted browser and API search are open. The app has no per-IP rate limiter, so protect a publicly reachable instance with a rate-limiting reverse proxy or Cloudflare Bot Fight Mode and a Managed Challenge rule. Per-service circuit breakers are a final upstream safeguard, not a replacement for edge protection.

## Public Cloudflare instance

The public site runs on Cloudflare Workers. `wrangler.toml` sets `DISABLE_API_SEARCH="true"`, so `/api/search` returns 403 while browser search and universal links remain open without login. Unlike the retired Plunk-key signal, this switch is explicit and does not depend on an email provider. When Cloudflare challenges an htmx search, the app navigates to `/verify`, lets the browser pass the check, and resumes the original search once.

Pushes to `main` typecheck, lint, build the edge bundle, audit native imports, and deploy through Wrangler. GitHub needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Each required adapter setting also needs to be configured as a Worker secret or variable. `APP_URL` must be the custom domain, not the `workers.dev` hostname, because the app uses it to construct universal links.

The exact host-scoped WAF rule, Bot Fight Mode settings, and incident-response decisions are maintained in `AGENTS.md`. The retired email-quota Durable Object has no binding or exported class. Migration history retains `v1`; `v2-remove-quota` deletes `QuotaDO` and any stored counters on deployment. This deletion is irreversible. Roll back application code only with a compatible migration plan, not by removing migration history or restoring a binding to a deleted class. Obsolete email-login secrets can be removed separately through the operator's usual secret-management process; the app no longer reads them.
