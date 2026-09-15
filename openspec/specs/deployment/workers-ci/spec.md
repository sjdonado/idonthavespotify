## Purpose

Makes the live deployment target (Cloudflare Workers) what CI ships, replacing the Dokku push that no longer matches where the public demo runs.

## Requirements

### Requirement: Push to master deploys the worker

Pushes to `master` SHALL build the edge bundle, audit it for native imports, and deploy it with Wrangler; a failed check SHALL block the deploy.

#### Scenario: Green push ships

- **WHEN** a commit lands on master with typecheck, lint, tests, and the edge audit green
- **THEN** the worker serves the new bundle

### Requirement: Dokku remains a documented self-host path

The Dokku workflow SHALL be removed from CI; self-hosting via the single binary (Docker or bare) SHALL stay documented in README.

#### Scenario: No dead deploy path

- **WHEN** a reader follows the deploy docs
- **THEN** exactly one automated path (Workers) and one manual path (binary) exist, with required secrets listed by name
