# API Documentation

Base URL: `http://idonthavespotify.sjdonado.com`

## Endpoints

### POST `/api/search`

Convert music links across streaming platforms.

**Authentication:**
- If `API_AUTH_KEY` environment variable is configured, requests must include an `Authorization` header with a Bearer token
- Header format: `Authorization: Bearer <your-api-key>`

**Query Parameters:**
- `v` (required): API version, must be `"1"`

**Request Headers:**
- `Authorization` (required if API_AUTH_KEY is set): `Bearer <your-api-key>`
- `Content-Type`: `application/json`

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
  "universalLink": "string",
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
- `401`: Unauthorized - Invalid or missing API key
- `429`: Rate limit exceeded (10 requests/minute)
- `500`: Processing failed

**Example:**
```bash
curl -X POST "http://idonthavespotify.sjdonado.com/api/search?v=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-here" \
  -d '{
    "link": "https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc",
    "adapters": ["youTube", "appleMusic"]
  }'
```

**Example without authentication (when API_AUTH_KEY is not configured):**
```bash
curl -X POST "http://idonthavespotify.sjdonado.com/api/search?v=1" \
  -H "Content-Type: application/json" \
  -d '{
    "link": "https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc",
    "adapters": ["youTube", "appleMusic"]
  }'
```

### GET `/api/status`

Check rate limit status for your IP.

**Response (200):**
```json
{
  "ip": "string",
  "rateLimits": {
    "web": {
      "allowed": "boolean",
      "remaining": "number",
      "resetIn": "number"
    },
    "api": {
      "allowed": "boolean",
      "remaining": "number",
      "resetIn": "number"
    }
  },
  "storeSize": {
    "web": "number",
    "api": "number"
  },
  "timestamp": "string"
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

## Rate Limits

- **Limit:** 10 requests per minute per IP
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Reset timestamp
  - `Retry-After`: Seconds to wait (when rate limited)

## Error Responses

All errors follow this format:
```json
{
  "error": "error message",
  "retryAfter": 60 (optional, only on 429)
}
```
