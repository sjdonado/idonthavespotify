## Purpose

Declares that the system performs no analytics tracking whatsoever so removing Umami leaves no silent beacons in server responses, HTML, or client code.

## ADDED Requirements

### Requirement: No server-side tracking calls

The API request path SHALL NOT emit analytics events to any tracking service; search latency and failure behavior MUST NOT depend on analytics availability.

#### Scenario: Search works with analytics fully removed

- **WHEN** a client posts to `/api/search?v=1`
- **THEN** the response is produced with zero outbound tracking calls and no analytics dependency in the module graph

### Requirement: No client-side tracking assets or calls

Served HTML SHALL NOT include third-party tracking scripts, and client controllers SHALL NOT reference a tracking global.

#### Scenario: Landing page has no trackers

- **WHEN** a client loads `/` and inspects the HTML, network requests, and console
- **THEN** no tracking script tag exists, no tracking request fires, and no tracking-related console errors appear
