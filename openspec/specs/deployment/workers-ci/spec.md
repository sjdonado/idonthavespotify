## Purpose

Makes the live deployment target (Cloudflare Workers) what CI ships. Dokku is fully retired (remote removed); self-hosting is the single binary, bare or in Docker.

## Requirements

### Requirement: Push to main deploys the worker

Pushes to `main` SHALL build the edge bundle, audit it for native imports, and deploy it with Wrangler; a failed check SHALL block the deploy.

#### Scenario: Green push ships

- **WHEN** a commit lands on main with typecheck, lint, tests, and the edge audit green
- **THEN** the worker serves the new bundle

### Requirement: Dokku stays retired

No CI job, document, or remote SHALL reference a Dokku deploy path; self-hosting via the single binary (Docker or bare) SHALL stay documented in README.

#### Scenario: No dead deploy path

- **WHEN** a reader follows the deploy docs
- **THEN** exactly one automated path (Workers) and one manual path (binary) exist, with required secrets listed by name
