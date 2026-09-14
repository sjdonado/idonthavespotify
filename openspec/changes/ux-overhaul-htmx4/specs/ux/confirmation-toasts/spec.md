## Purpose

Notifications must answer what happened and nothing else, so a toast always settles the outcome and failures are never mistaken for noise.

## ADDED Requirements

### Requirement: Toasts fire on confirmations only

Toasts SHALL confirm outcomes only (link copied, email verified, copy failed with no inline surface to land on). Field and action failures SHALL never toast; they render inline where the action happened.

#### Scenario: Copy a link

- **WHEN** a user copies a result link
- **THEN** a success toast confirms it

#### Scenario: Search rejected

- **WHEN** a web search or gate step fails
- **THEN** no toast appears and the error renders inline in place

### Requirement: No third-party toast dependency

The confirmation toaster SHALL be dependency-free first-party code.

#### Scenario: Copy on a fresh install

- **WHEN** a user copies a link after `bun install` with no extra packages
- **THEN** the confirmation toast still appears
