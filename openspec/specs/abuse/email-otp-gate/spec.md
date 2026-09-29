## Purpose

The email wall is retired. Web search and shared links are open on the public instance; programmatic search stays disabled there until API keys land. The email modules remain dormant for that future feature.

## Requirements

### Requirement: Web search and shared links need no identity

`POST /search` and `GET /?id=` SHALL serve unauthenticated callers with no quota checks; no login UI SHALL render.

#### Scenario: Open search

- **WHEN** a visitor posts a link to `/search` or opens a `?id=` share link
- **THEN** the search runs (or the cached card renders) with no 401 and no challenge in code

### Requirement: Public API search stays disabled

`POST /api/search` SHALL answer 403 with a machine-readable `auth: "api-key"` hint on the public instance, making no upstream calls; self-hosted instances (no Plunk key) SHALL keep serving it.

#### Scenario: Disabled before validation

- **WHEN** any client posts to `/api/search` on the public instance, even with an invalid link
- **THEN** the response is 403 with `auth: "api-key"`

### Requirement: Email auth endpoints stay retired

`POST /api/auth/request-code` and `POST /api/auth/verify-code` SHALL answer 410; the `src/abuse/*` modules (OTP, session, email policy, quota, Plunk client, quota DO) SHALL stay untouched for the future header-key API feature.

#### Scenario: Retired endpoints

- **WHEN** a client posts to either auth endpoint
- **THEN** the response is 410

### Requirement: Edge challenge instead of a wall

Suspicious traffic SHALL meet a Cloudflare Managed Challenge (plus Bot Fight Mode) at the edge, covering page loads, searches, and the disabled API alike.

#### Scenario: Humans pass, bots prove

- **WHEN** a human searches or opens a share link
- **THEN** no challenge renders in the app; known-bot and suspicious traffic is challenged at the edge
