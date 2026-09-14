# API Documentation

Base URL: `http://idonthavespotify.sjdonado.com`

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
  - Available: `spotify`, `youTube`, `appleMusic`, `deezer`, `soundCloud`, `tidal`

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
  "universalLink": "string (plain `APP_URL?id=<id>` share link, e.g. `https://idonthavespotify.donado.co?id=encoded_id`)",
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
- `401`: Email verification required (public demo only; response carries `auth: "email-otp"`)
- `429`: Per-email quota reached (response carries `retryAfter` seconds)
- `500`: Processing failed
- `503`: Quota check or gate temporarily unavailable

On the public demo, search is gated behind a browser login: logging in mints a session cookie, and that cookie is the only credential `/api/search` accepts. There are no API tokens, so programmatic clients such as the Raycast extension target self-hosted instances, where the gate is off and search stays open.

**Example:**
```bash
curl -X POST "http://idonthavespotify.sjdonado.com/api/search?v=1" \
  -H "Content-Type: application/json" \
  -d '{
    "link": "https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc",
    "adapters": ["youTube", "appleMusic"]
  }'
```

### POST `/api/auth/request-code`

Send a 6-digit code to an email address (public demo only).

**Request Body:**
```json
{
  "email": "string (required, popular providers only, no `+` aliases)"
}
```

**Response (200):**
```json
{ "ok": true }
```

**Errors:**
- `400`: Rejected address (unknown provider, alias, disposable, typo hint)
- `429`: Code already sent, retry with `retryAfter` seconds
- `502`: Code could not be sent

### POST `/api/auth/verify-code`

Exchange an email plus code for a session. Post a form for a session cookie plus page refresh (web UI); with `Accept: application/json` the same call sets the cookie and answers `{ "ok": true }`. No tokens are issued.

**Request Body:**
```json
{
  "email": "string (required)",
  "code": "string (required, 6 digits)"
}
```

**Response (200, JSON):**
```json
{ "ok": true }
```
plus a `Set-Cookie: idhs_session=...` header (30-day TTL).

**Errors:**
- `400`: Invalid or expired code

### GET `/api/status`

Service quota and health overview (service-guard budgets plus timestamp).
When the demo gate is on, the response also names the quota policy, and
authenticated callers see their remaining searches.

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
    "enabled": "boolean",
    "quota": { "limit": "number", "windowSec": "number", "cooldownSec": "number" }
  },
  "identity": "object (optional, when authenticated)",
  "identity.remaining": "number",
  "identity.resetInSec": "number"
}
```

**Example:**
```bash
curl "http://idonthavespotify.sjdonado.com/api/status"
```

## Supported Platforms

**Input (parseable):**
- Spotify: `https://open.spotify.com/*` or `https://spotify.link/*`
- YouTube: `https://youtube.com/watch?v=*`, `https://youtu.be/*`, `https://music.youtube.com/*`
- Apple Music: `https://music.apple.com/*/*`
- Deezer: `https://www.deezer.com/*/*`
- SoundCloud: `https://soundcloud.com/*/*`, `https://on.soundcloud.com/*`
- Tidal: `https://tidal.com/browse/*/*`
- Google Music Share: `https://www.google.com/gasearch*`, `https://share.google/*`

**Output (searchable):**
- Spotify, YouTube, Apple Music, Deezer, SoundCloud, Tidal

## Error Responses

All errors follow this format:
```json
{
  "error": "error message"
}
```
