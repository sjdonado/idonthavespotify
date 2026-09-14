## Purpose

Defines the contract for the self-hosted single-file executable so operators can run the whole app from one binary with no sidecars and no separate static asset directory.

## Requirements

### Requirement: Single binary serves the full app

The system SHALL ship a single executable that serves the web UI, the htmx fragment endpoint, and the JSON API with no additional runtime processes.

#### Scenario: Boot and serve from one process

- **WHEN** an operator runs the compiled binary with required env vars set
- **THEN** `GET /` returns the landing page, `POST /search` returns a search card fragment, `POST /api/search?v=1` returns JSON, and `GET /api/status` returns status, all from that process

### Requirement: Frontend assets are embedded

The binary SHALL embed the built frontend assets (JS bundle, CSS bundle, favicon) so it serves correct content without a `public/` directory on disk.

#### Scenario: Assets served without public directory

- **WHEN** the binary runs in a working directory containing no `public/` folder
- **THEN** the stylesheet, client script, and favicon referenced by the HTML return 200 with correct content types

### Requirement: Static routes keep URL behavior

Static asset URLs and error behavior SHALL stay identical to the current deployment: existing asset paths return 200, unknown paths return 404, and traversal attempts are rejected.

#### Scenario: Unknown and hostile paths

- **WHEN** a client requests a nonexistent asset path or a path containing traversal segments
- **THEN** the system returns 404 or 400 and never serves files outside the asset set

### Requirement: Production binary is optimized

Release builds SHALL enable minification and linked sourcemaps for size and debuggability. Bytecode compilation stays off until Bun supports it alongside top-level await (1.4.2 rejects the combination at build time).

#### Scenario: Release artifact check

- **WHEN** CI builds the production binary
- **THEN** the build uses minify and linked sourcemaps and the resulting binary passes the boot smoke test
