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
- `500`: Processing failed

**Example:**
```bash
curl -X POST "http://idonthavespotify.sjdonado.com/api/search?v=1" \
  -H "Content-Type: application/json" \
  -d '{
    "link": "https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc",
    "adapters": ["youTube", "appleMusic"]
  }'
```

### GET `/api/status`

Service quota and health overview (service-guard budgets plus timestamp).

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

## Error Responses

All errors follow this format:
```json
{
  "error": "error message"
}
```
