## Purpose

Gates demo usage behind a lightweight email identity so one actor cannot burn shared upstream quotas, without accounts, passwords, or a signup page.

## ADDED Requirements

### Requirement: Search requires a verified email session unless disabled

Search endpoints (web and API) SHALL reject unauthenticated callers with 401 when the gate is enabled; setting the documented env flag SHALL disable the gate entirely (self-host default).

#### Scenario: Unauthenticated search is rejected

- **WHEN** the gate is enabled and a client posts to `/api/search` without credentials
- **THEN** the response is 401 with a machine-readable `auth: "email-otp"` hint and no upstream calls are made

#### Scenario: Kill-switch restores open access

- **WHEN** the env flag disables the gate
- **THEN** all search behavior is byte-identical to the pre-gate app

### Requirement: Inline OTP flow with no signup page

The web UI SHALL offer email input in place (where search lives): submitting an address sends a one-time code via Plunk; entering the code mints a session cookie and reveals search. No passwords, no magic links, no separate page.

#### Scenario: Email to search in two steps

- **WHEN** a new visitor enters an allowed email and then the correct code
- **THEN** they can search immediately, and the email is stored for abuse decisions only

### Requirement: API clients authenticate with a bearer token

After OTP verification, API clients SHALL receive a short-lived bearer token (same verification call, `Accept: application/json`) usable in `Authorization: Bearer`; expiry SHALL be enforced.

#### Scenario: Raycast-style flow

- **WHEN** a client completes OTP over JSON
- **THEN** it receives a bearer token that authorizes `/api/search` until expiry

### Requirement: Provider allowlist and no aliases

Only allowlisted popular providers SHALL be accepted; addresses with `+` aliases SHALL be rejected with a clear message; Plunk `/v1/verify` SHALL backstop disposables, MX, and typos.

#### Scenario: Alias rejected, typo helped

- **WHEN** a visitor enters `name+tag@gmail.com`
- **THEN** they get an alias rejection, not a code; a typo'd domain gets a did-you-mean style hint where the verifier supports it

### Requirement: Per-email search quota with cooldown

Each verified email SHALL get 6 searches per rolling 4 minutes; past the quota the API SHALL return 429 with a retry hint and enforce a 2-minute cooldown. Counters live in a Durable Object keyed by email hash with auto-expiring windows; quota checks SHALL fail closed on DO errors.

#### Scenario: Quota exhausted

- **WHEN** a verified email makes a 7th search within 4 minutes
- **THEN** the response is 429 naming the 2-minute cooldown, no upstream calls are made, and searches succeed again after the window lapses

### Requirement: Stateless codes, minimal email data

OTP codes SHALL be verifiable without server-side storage (HMAC of email plus time window with a session secret); emails SHALL be used only for abuse decisions, never marketing, and Plunk sends SHALL use non-persistent template data.

#### Scenario: Code verifies across isolates

- **WHEN** the code is issued on one isolate and verified on another
- **THEN** verification succeeds within the window and fails outside it, with no shared state
