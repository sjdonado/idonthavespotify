## Purpose

Defines the contract for the optional public Cloudflare Workers deployment so it reuses the same routes and search behavior while its edge-specific deltas stay explicit and documented.

## Requirements

### Requirement: Same routes on the edge target

The Workers deployment SHALL expose `GET /`, `POST /search`, `POST /api/search`, and `GET /api/status` with the same request shapes, response shapes, and status codes as self-host.

#### Scenario: Edge parity smoke test

- **WHEN** the edge bundle is deployed to a preview worker
- **THEN** landing page load, invalid-link search (400 JSON), versioned API validation errors, and the status endpoint all match self-host responses

### Requirement: No native or Node-only modules on edge

The edge bundle SHALL NOT depend on `impit`, `pino-pretty`, or `@umami/node`; outbound HTTP uses the platform `fetch` backend and logging uses the console shim.

#### Scenario: Edge bundle builds clean

- **WHEN** CI bundles the edge entry with the browser-compatible target
- **THEN** the build succeeds with no native addon imports and the bundle boots under the Workers runtime

### Requirement: Secrets come from bindings

The edge target SHALL read configuration from Worker bindings and secrets, never from a `.env` file on disk.

#### Scenario: Missing binding fails closed with a clear error

- **WHEN** a required binding is absent at request time
- **THEN** the request fails with a 500 and a log line naming the missing binding, without leaking binding values

### Requirement: Edge deltas are documented

Known edge differences SHALL be documented in the change: fetch-based HTTP instead of TLS impersonation (results on guarded sources may differ), per-isolate in-memory cache (service-guard budgets stay the shared quota protection), no URL shortener, no per-IP limiting in the app, and platform CPU and memory limits.

#### Scenario: Deltas visible to the operator

- **WHEN** an operator reads the Workers deploy docs
- **THEN** each delta above is listed with its user-visible consequence and the abuse controls required for the public instance (Bot Fight Mode plus a WAF Managed Challenge rule in front; service-guard circuits stay the final fuse for upstream quotas)

### Requirement: Public instance sits behind the edge challenge

The public instance deployment SHALL be guarded by Bot Fight Mode plus one Cloudflare WAF Managed Challenge rule matching `(http.request.uri.path in {"/" "/search" "/api/search"})`. Suspicious visitors SHALL get an interactive challenge automatically while humans pass through. Self-hosted instances SHALL NOT require any Cloudflare rule, but MUST be exposed publicly only behind Cloudflare (with the rule above) or a rate-limiting reverse proxy, since the app itself ships no per-IP limiter.

#### Scenario: Flood challenged before the Worker runs

- **WHEN** bot or suspicious traffic hits the search routes
- **THEN** the edge challenges it without consuming worker quota, subrequests, or isolate state
