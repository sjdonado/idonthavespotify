## Purpose

Defines the universal share link contract after removing the URL shortener so shared links stay stable, predictable, and free of any third-party shortening service.

## ADDED Requirements

### Requirement: universalLink is the plain app URL

API search results SHALL return `universalLink` as the full application URL with the search id query parameter (`APP_URL?id=...`), never a shortened URL.

#### Scenario: API response contains plain link

- **WHEN** a client posts a valid link to `/api/search?v=1`
- **THEN** the response `universalLink` starts with the configured app URL, contains the search id, and requires no shortener service to resolve

### Requirement: Share button copies the plain link

The web UI share action SHALL copy the same plain universal link shown in the search card.

#### Scenario: Share from search card

- **WHEN** a user clicks Share on a search card
- **THEN** the clipboard receives the plain app URL with the search id

### Requirement: Universal link round-trips

Opening a universal link SHALL load the home page with the corresponding search result rendered.

#### Scenario: Open shared link

- **WHEN** a client opens `/?id=<known-id>` with cached metadata present
- **THEN** the page renders the search card for that result

## REMOVED Requirements

### Requirement: Shortened universal links

**Reason**: The `bit` shortener sidecar is no longer operated; keeping the integration means every search pays a third-party call and deployments need an extra service.

**Migration**: Consumers use the `universalLink` value as-is; it is now the full app URL. Operators remove the `bit` service from compose and drop shortener env vars (unset values are ignored).
