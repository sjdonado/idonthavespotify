# How link conversion works

A parser in `src/parsers/` identifies the source platform and extracts normalized metadata: title, artist, content type, cover art, and audio preview when available. It turns that metadata into a search query. Adapters in `src/adapters/` search destination platforms and return a URL with match flags. `isVerified` indicates a strong match signal; `notAvailable` disables a result whose score is too low to trust.

## Service-specific behavior

Spotify metadata comes from embed pages. Destination searches use the web player's internal GraphQL API with an automatically refreshed anonymous token. The token flow reads the player's TOTP secret and requires no Spotify developer account. The official Web API is not used.

Deezer and Apple Podcasts use official APIs. Other destinations use public pages or internal endpoints. These interfaces can change independently of the app.

Tidal has no direct search adapter: the required API entitlement was refused and its public pages have a bot wall. MusicBrainz supplies curated streaming links for destinations that did not return a match, including Tidal. For songs, the fallback first uses the ISRC from a verified Deezer match. Title-and-artist search is the backup, with relation lookups limited to about three seconds. This avoids picking an arbitrary recording from many equal-score title matches.

Invidious needs no upstream request. The app mirrors a YouTube watch, playlist, or channel path onto https://redirect.invidious.io, where the visitor chooses an available instance.

## Browser and edge behavior

The server renders pages with nano-jsx. htmx replaces result fragments, and Stimulus handles previews, sharing, errors, and the landing-page layout. Shared links use `APP_URL?id=<id>`. Their first response contains source metadata for link previews; a second request loads destination links inside the card.

Cloudflare Workers use platform fetch rather than the self-hosted TLS-impersonating transport. The edge cache is per isolate, share links remain plain app URLs, and Apple Music catalog metadata has no audio preview. Per-service budgets and circuit breakers protect upstream quotas on both runtimes.

The email-code wall and its Plunk, OTP, session, and per-email quota implementation have been removed. Legacy auth endpoints still return 410. Programmatic access is controlled by the explicit `DISABLE_API_SEARCH` setting, enabled for the public Worker and unset by default for self-hosted instances. This setting does not gate browser search or shared links and does not implement API-key authentication.
