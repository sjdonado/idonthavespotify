# Running and operating IDHS

## Local configuration

Use Bun 1.4.3 or newer. Create a local `.env` in the project root and set the variables below. Never commit credentials. The app reads configuration through `src/config/env.ts`; it does not require a Spotify developer account.

| Variables | Purpose |
| --- | --- |
| `APP_URL`, `PORT`, `NODE_ENV` | Set the app's public origin, listening port (3000 by default), and runtime mode. Use `http://localhost:3000` for local development. |
| `SPOTIFY_API_URL`, `SPOTIFY_BASE_URL` | Configure the Spotify web-player endpoints. |
| `YOUTUBE_API_URL`, `YOUTUBE_MUSIC_BASE_URL`, `YOUTUBE_API_KEY` | Configure YouTube search and result links. Obtain the key from https://console.developers.google.com/. |
| `DEEZER_API_URL`, `APPLE_MUSIC_API_URL`, `SOUNDCLOUD_BASE_URL` | Configure the corresponding search endpoints. |
| `QOBUZ_API_URL`, `QOBUZ_APP_ID`, `QOBUZ_STREAM_URL`, `QOBUZ_STORE_URL` | Configure Qobuz search and result links. |
| `BANDCAMP_API_URL`, `BANDCAMP_BASE_URL`, `PANDORA_API_URL`, `JIOSAAVN_API_URL`, `ITUNES_API_URL` | Configure the remaining destination endpoints. |

The checked-in environment template is `.env.test`. Use its endpoint settings when configuring an instance, but supply your own credentials. Leave `PLUNK_API_KEY` unset for self-hosted API access. Its presence selects public-instance behavior and disables `/api/search`; it does not send email. `SESSION_SECRET`, `PLUNK_TEMPLATE_ID`, and `IDHS_API_KEY_BETA` are dormant and do not enable API-key authentication.

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

The public site runs on Cloudflare Workers. Browser search and universal links require no login, but `/api/search` returns 403 until API keys are available. When Cloudflare challenges an htmx search, the app navigates to `/verify`, lets the browser pass the check, and resumes the original search once.

Pushes to `main` typecheck, lint, build the edge bundle, audit native imports, and deploy through Wrangler. GitHub needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Each required adapter setting also needs to be configured as a Worker secret or variable. `APP_URL` must be the custom domain, not the `workers.dev` hostname, because the app uses it to construct universal links.

The exact host-scoped WAF rule, Bot Fight Mode settings, Worker secret names, and incident-response decisions are maintained in `AGENTS.md`. The gate's Durable Object binding and migration remain dormant; do not remove them as part of routine configuration cleanup.
