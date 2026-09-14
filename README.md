> IDHS (I Don't Have Spotify)

You get a link on a streaming service you don't use, and you want to hear the song anyway. Copy the link, paste it into the search bar, and the app hands back the same track on every other service it knows about. When the original link comes from Spotify you even get a short audio preview, so you can confirm it found the right song before you tap through.

Playlists are deliberately out of scope. The app converts individual tracks, albums, artists, and podcasts, and it does that one job well instead of many jobs poorly.

## How a link becomes links

Every conversion runs through two stages, and keeping them separate is what makes a new service easy to add.

First a parser figures out which platform your link came from and pulls out normalized metadata: the title, the artist, what kind of thing it is, cover art when it can find it. From that metadata it builds one clean search query, the same shape no matter which service the link started on. You can read this stage in `src/parsers`, one file per platform.

Then adapters take that query and search each destination platform for the best match, each in its own way: some have official APIs, others are searched through their public pages. Every adapter answers the same question with the same shape, a URL plus two honest flags. `isVerified` means the platform gave a strong match signal, and `notAvailable` means the score was so low you probably should not trust it. That logic lives in `src/adapters`, again one file per platform.

| Adapter          | Inverted Search | Official API           | Verified Links |
| ---------------- | --------------- | ---------------------- | -------------- |
| Spotify          | Yes             | No                     | Yes            |
| Tidal            | Yes             | Yes                    | Yes            |
| YouTube Music    | Yes             | No                     | Yes            |
| Apple Music      | Yes             | No                     | Yes            |
| Deezer           | Yes             | Yes                    | Yes            |
| SoundCloud       | Yes             | No                     | Yes            |
| Qobuz            | Yes             | No                     | Yes            |
| Bandcamp         | Yes             | No                     | Yes            |
| Pandora          | Yes             | No                     | Yes            |

"Inverted search" means the adapter can be a search target. A few notes on the ones that behave unusually: Spotify has no usable official API for this project, so search runs through the same internal GraphQL API the Spotify web player uses, with an anonymous access token minted by a TOTP flow (more on that below). Tidal does have an official API, and it works from self-hosted instances; from Cloudflare Workers egress its search endpoint currently answers 400, which the adapter surfaces as an ordinary miss while the cause is being diagnosed, so self-host results are unaffected. Apple Music on the edge resolves through its catalog pages with no audio preview.

## The web app and the Raycast extension

The web app is the main interface, a single page with a search bar, instant result cards, and shareable universal links in the form `APP_URL?id=<id>`. Anyone opening your universal link sees the same result card without searching again.

<div align="center">
<img width="1831" height="969" alt="image" src="https://github.com/user-attachments/assets/98d6f3ca-3627-49ea-ad2b-0c2b64668b14" />
</div>

### Raycast

<a title="Install idonthavespotify Raycast Extension" href="https://www.raycast.com/sjdonado/idonthavespotify"><img src="https://www.raycast.com/sjdonado/idonthavespotify/install_button@2x.png?v=1.1" height="64" style="height: 64px;" alt=""></a>

Source code: https://github.com/raycast/extensions/tree/main/extensions/idonthavespotify

The extension talks to a self-hosted instance, where search stays open. It does not work against the public demo, which needs a browser login (see below) and issues no API tokens.

## Running it locally

You need Bun 1.4.2 or newer; check with `bun --version`. The full list of environment variable names lives in `.env.test`, and only real values go in your own `.env`, which is never committed. Two of them need accounts elsewhere: `TIDAL_CLIENT_ID` and `TIDAL_CLIENT_SECRET` come from the [TIDAL Developer Portal](https://developer.tidal.com/), and `YOUTUBE_API_KEY` comes from the [Google Developers Console](https://console.developers.google.com/).

A note on Spotify, since it surprises people: as of March 2026, Spotify [restricted its Web API](https://www.reddit.com/r/webdev/comments/1rflyiz/changes_to_spotify_api/) to require a Premium account for Development Mode and cut down the available endpoints. This project has no premium account, so instead of the official API it uses the web player's own internal API with an automatically refreshed anonymous token, which needs no developer account and expires after about an hour. That is why the Spotify adapter scrapes the player bundle for its TOTP secret at token time.

Once the values are in place, starting the app is two commands:

```sh
bun install
bun dev
```

## Self-hosting

The supported self-host path is the single compiled binary, bare or inside Docker. It serves everything on its own: pages, API, and static assets, with no sidecars and no separate asset copy to manage.

```sh
bun run build
bun run build:prod
./dist/idonthavespotify # serves everything, no sidecars, no `public/` copy needed
```

`PORT` and `NODE_ENV` configure the binary, and it reads `.env` from the working directory. Self-hosted instances leave the demo gate off by default, so search stays open exactly like it always was; the one thing the app deliberately does not ship is a per-IP rate limiter, so only expose your instance publicly behind Cloudflare (with a rate limiting rule like the demo's, described in AGENTS.md) or a rate-limiting reverse proxy.

## The public demo and its abuse protection

The public demo runs on Cloudflare Workers, and because it sits on shared upstream quotas, it asks who you are before it searches. There are no accounts, no passwords, and no signup page, just an email address that proves you can receive mail.

On the web the flow happens inline, right where the search bar lives. You type your email, receive a six-digit code, type the code, and a session cookie is minted that unlocks search immediately, in the browser and for its API calls alike. The cookie lasts 30 days and is the only credential the demo accepts: there are no API tokens, so anything programmatic, including the Raycast extension, runs against a self-hosted instance instead. Only popular mailbox providers are accepted, addresses with `+` aliases are rejected before anything is sent, and Plunk's verifier double-checks disposables, mail records, and typos. Gmail-style dot variations are normalized first, so `first.last` and `firstlast` count as the same address.

Every verified address gets 6 searches per rolling 4 minutes. Past that the API answers 429 with a retry hint and a 2-minute cooldown, without touching any upstream service. Unauthenticated search answers 401 with an `auth: "email-otp"` hint, also without touching upstream. The counters live in a Durable Object keyed by email hash, deliberate because an identity key makes each counter small and meaningful, and quota checks fail closed: if the counter store is unreachable, searches wait rather than running unlimited. The Cloudflare WAF rule and the per-service circuit breakers stay on as the outer layers, unchanged.

Your address is used for abuse decisions only. It is never used for marketing, and the code is delivered with non-persistent template data so it is never stored on your contact record. If the gate ever misbehaves, blanking the Plunk key restores fully open access without a redeploy, since the gate only arms when a key is set.

### Operating the demo

Deployments happen automatically: every push to `master` typechecks, lints, builds the edge bundle, audits it for native imports, deploys it with Wrangler, and then smokes `/`, `/api/status`, and an invalid-link 400. A failed check blocks the deploy. The GitHub secrets that make this work are `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, with an optional `DEMO_URL` overriding the default smoke target.

Before the gate can run on a fresh Cloudflare account, three values have to exist as worker secrets, set with `bunx wrangler secret put` and never written into the repo: `PLUNK_API_KEY` for sending mail, which is also the switch that arms the gate, `SESSION_SECRET` which signs both the one-time codes and the session tokens, and `PLUNK_TEMPLATE_ID` pointing at the dashboard template that defines the sender, subject, and body (the code arrives as one-shot template data). Plunk also needs a verified sender domain, which you arrange in the Plunk dashboard. The edge worker guide, including the WAF rule and the Durable Object details, lives in AGENTS.md.

## More info

Contributions are more than welcome, just open a PR and I'll review it promptly.

<img width=50 src="https://user-images.githubusercontent.com/27580836/227801051-a71d389e-2510-4965-a23e-d7478fe28f13.jpeg"/>
Icon Generated by https://deepai.org/machine-learning-model/text2img
