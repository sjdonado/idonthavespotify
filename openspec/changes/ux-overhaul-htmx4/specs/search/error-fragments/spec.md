## Purpose

Web search and gate rejections must answer where the user acted, as swappable page content, while programmatic API clients keep their exact JSON contract.

## ADDED Requirements

### Requirement: Invalid-link errors render inline in the results area

Posting an invalid link to the web search endpoint SHALL return an HTML error fragment with HTTP 400 (not JSON), so the message swaps into the results area and the search form keeps its value.

#### Scenario: Invalid link shows inline error

- **WHEN** a user posts `https://open.spotify.com/invalid` to `/search` from the web form
- **THEN** the response is HTTP 400 HTML containing the invalid-link message and the search input still holds the posted link

### Requirement: Unauthenticated web search points at verification

When the public instance gate is enabled, an unauthenticated web search SHALL return an HTML fragment with HTTP 401 that tells the user to verify their email and how to do it, instead of a JSON body.

#### Scenario: Stranger searches while gated

- **WHEN** an unverified browser posts any link to `/search` with the gate on
- **THEN** the response is HTTP 401 HTML pointing at email verification, and no validity signal about the posted link leaks

### Requirement: Quota denials render inline with retry guidance

A web search denied by per-email quota SHALL return an HTML fragment with HTTP 429 stating when to retry, and the `Retry-After` header SHALL still be present.

#### Scenario: Quota exhausted on web

- **WHEN** a verified user over quota posts to `/search` from the web form
- **THEN** the response is HTTP 429 HTML naming the retry wait, with a matching `Retry-After` header

### Requirement: Server failures render a generic fragment

Unhandled web search failures SHALL return an HTML fragment with HTTP 5xx carrying a generic message that reveals no internals.

#### Scenario: Upstream blows up

- **WHEN** a web search throws beyond validation and quota
- **THEN** the response is HTTP 5xx HTML with the generic failure message

### Requirement: JSON API error contract is frozen

Requests that ask for JSON (Accept or Content-Type `application/json`) SHALL keep the exact current error shapes and statuses on every search and gate endpoint. Message strings follow the public-instance wording; shapes never change.

#### Scenario: API client hits the same failures

- **WHEN** a JSON client posts an invalid link, searches unauthenticated, or verifies a wrong code
- **THEN** statuses and `{error}/{message}` shapes match, with public-instance message strings
