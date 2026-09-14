## Purpose

Gates demo usage behind a lightweight email identity so one actor cannot burn shared upstream quotas, without accounts, passwords, or a signup page.

## ADDED Requirements

### Requirement: Search requires a verified email session unless disabled

Search endpoints (web and API) SHALL reject unauthenticated callers with 401 when the gate is enabled; a blank or unset Plunk key SHALL disable the gate entirely (self-host default, no separate flag).

#### Scenario: Unauthenticated search is rejected

- **WHEN** the gate is enabled and a client posts to `/api/search` without credentials
- **THEN** the response is 401 with a machine-readable `auth: "email-otp"` hint and no upstream calls are made

#### Scenario: Kill-switch restores open access

- **WHEN** no Plunk key is configured
- **THEN** all search behavior is byte-identical to the pre-gate app

### Requirement: Inline OTP flow with no signup page

The web UI SHALL offer email input in place (where search lives): submitting an address sends a one-time code via Plunk; entering the code mints a session cookie and reveals search. No passwords, no magic links, no separate page.

#### Scenario: Email to search in two steps

- **WHEN** a new visitor enters an allowed email and then the correct code
- **THEN** they can search immediately, and the email is stored for abuse decisions only

### Requirement: Gated search needs the login cookie; no bearer tokens

Only the session cookie minted by the web login SHALL authorize search on the gated instance; verify-code SHALL NOT issue bearer tokens. Programmatic API clients (e.g. Raycast) stay supported on self-hosted instances, where the gate is off.

#### Scenario: Cookie replay authorizes, bare API calls do not

- **WHEN** a logged-in browser replays its session cookie on `/api/search`
- **THEN** it searches until the cookie expires; the same call without the cookie is 401

### Requirement: Provider allowlist and no aliases

Only allowlisted popular providers SHALL be accepted; addresses with `+` aliases SHALL be rejected with a clear message; Plunk `/v1/verify` SHALL backstop disposables, MX, and typos.

#### Scenario: Alias rejected, typo helped

- **WHEN** a visitor enters `name+tag@gmail.com`
- **THEN** they get an alias rejection, not a code; a typo'd domain gets a did-you-mean style hint where the verifier supports it

### Requirement: Per-email search quota with cooldown

Each verified email SHALL get 6 searches per rolling 4 minutes; past the quota the API SHALL return 429 with a retry hint and enforce a 2-minute cooldown. The hint SHALL name a delay the client can honor: at least the cooldown, longer when the rolling window is still full. Counters live in a Durable Object keyed by email hash with auto-expiring windows; quota checks SHALL fail closed on DO errors.

#### Scenario: Quota exhausted

- **WHEN** a verified email makes a 7th search within 4 minutes
- **THEN** the response is 429 naming an honest retry delay (2-minute cooldown minimum, rolling-window expiry after burst traffic), no upstream calls are made, and searches succeed again after the window lapses

### Requirement: Stateless codes, minimal email data

OTP codes SHALL be verifiable without server-side storage (HMAC of email plus time window with a session secret); emails SHALL be used only for abuse decisions, never marketing, and Plunk sends SHALL use non-persistent template data.

#### Scenario: Code verifies across isolates

- **WHEN** the code is issued on one isolate and verified on another
- **THEN** verification succeeds within the window and fails outside it, with no shared state
