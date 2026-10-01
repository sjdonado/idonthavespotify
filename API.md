# API Documentation

Base URL: `https://idonthavespotify.sjdonado.com` (public instance: web UI, shared links, and status; programmatic `/api/search` there is disabled, so the search examples below use a self-hosted instance at `http://localhost:3000`).

## Endpoints

### POST `/api/search`

Convert music links across streaming platforms.

**Query Parameters:**
- `v` (required): API version, must be `"1"`

**Request Body:**
```json
{
  "link": "string (required)",
  "adapters": ["string"] (optional)
}
```

- `link`: Valid music link from any supported platform
- `adapters`: Target platforms (default: all platforms)
  - Available: `spotify`, `youTube`, `appleMusic`, `deezer`, `soundCloud`, `tidal`, `qobuz`, `bandcamp`, `pandora`, `jiosaavn`, `applePodcasts`, `podcastFeed`, `invidious` (Tidal resolves via the MusicBrainz fallback; `podcastFeed` returns an RSS feed URL and only runs for podcast and show searches; `invidious` returns a privacy-friendly `https://redirect.invidious.io` link with the same watch, playlist, or channel path as the YouTube result, so it appears only when a YouTube link is present, pasted or found)

**Response (200):**
```json
{
  "id": "string",
  "type": "song|album|playlist|artist|podcast|show",
  "title": "string",
  "description": "string",
  "image": "string (optional)",
  "audio": "string (optional)",
  "source": "string",
  "universalLink": "string (plain `APP_URL?id=<id>` share link, e.g. `https://idonthavespotify.sjdonado.com?id=encoded_id`)",
  "links": [
    {
      "type": "string",
      "url": "string",
      "isVerified": "boolean (optional)",
      "notAvailable": "boolean (optional)"
    }
  ]
}
```

**Errors:**
- `400`: Invalid link or missing parameters
- `403`: API search disabled on the public instance (response carries `auth: "api-key"`)
- `500`: Processing failed

On the public instance, programmatic search is disabled: `/api/search` answers 403 without touching any upstream service, and it stays that way until API keys land. Programmatic clients such as the Raycast extension target self-hosted instances, where search stays open.

**Example** (self-hosted instance; the public instance answers 403):
```bash
curl -X POST "http://localhost:3000/api/search?v=1" \
  -H "Content-Type: application/json" \
  -d '{
    "link": "https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc",
    "adapters": ["youTube", "appleMusic"]
  }'
```

### POST `/api/auth/request-code`

Retired: email login is gone from the public instance, so this endpoint answers 410.

### POST `/api/auth/verify-code`

Retired: email login is gone from the public instance, so this endpoint answers 410.

### GET `/api/status`

Service health overview (service-guard budgets plus timestamp).

**Response (200):**
```json
{
  "serviceGuards": {
    "<service>": {
      "callsUsed": "number",
      "callsMax": "number",
      "windowResetsIn": "number",
      "circuitOpen": "boolean",
      "failures": "number"
    }
  },
  "timestamp": "string",
  "gate": {
    "enabled": false
  }
}
```

**Example:**
```bash
curl "https://idonthavespotify.sjdonado.com/api/status"
```

## Supported Platforms

**Input (parseable):**
- Spotify: `https://open.spotify.com/*` or `https://spotify.link/*`
- YouTube: `https://youtube.com/watch?v=*`, `https://youtu.be/*`, `https://music.youtube.com/*`
- Apple Music: `https://music.apple.com/*/*`
- Deezer: `https://www.deezer.com/*/*`
- SoundCloud: `https://soundcloud.com/*/*`, `https://on.soundcloud.com/*`
- Tidal: `https://tidal.com/browse/*/*`
- JioSaavn: `https://www.jiosaavn.com/song|album|artist|featured|playlist/*`
- Apple Podcasts: `https://podcasts.apple.com/*/podcast/*` (show and episode links)
- Google Music Share: `https://www.google.com/gasearch*`, `https://share.google/*`

**Output (searchable):**
- Spotify, YouTube, Apple Music, Deezer, SoundCloud, Tidal, Qobuz, Bandcamp, Pandora, JioSaavn, Apple Podcasts, RSS feed (podcast and show searches only), Invidious (derived from the YouTube result)

## Error Responses

All errors follow this format:
```json
{
  "error": "error message"
}
```
