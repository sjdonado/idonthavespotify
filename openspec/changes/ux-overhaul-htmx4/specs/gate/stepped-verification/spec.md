## Purpose

The public instance email gate must guide a stranger from address to verified session as a visible stepped flow, so nobody wonders whether the code is coming or what to do next.

## ADDED Requirements

### Requirement: Gate blocks in a centered modal

Without a session the gate SHALL render as a centered modal card over a dimmed app, making clear the app cannot be used until verification completes. Escape and backdrop clicks SHALL NOT dismiss it.

#### Scenario: Gated landing

- **WHEN** an unverified user opens the app
- **THEN** a centered modal holds the gate flow and the app behind is unreachable

### Requirement: Gate steps stack full-width like industry auth cards

Each gate step SHALL stack heading, guidance, input, and a full-width primary action in a narrow card, with the email step keeping the entered value on error and the code step echoing the address.

#### Scenario: Narrow phone

- **WHEN** a gated user opens the app at 360 CSS px
- **THEN** nothing overflows or crushes: input above, full-width button below

### Requirement: Gate shows its step

The gate panel SHALL always show exactly one of idle, sending, sent, verifying, or verified, with the current step obvious from the panel content.

#### Scenario: Email submitted

- **WHEN** a user submits an address
- **THEN** the panel leaves idle for sending, then shows the code form on sent

### Requirement: Gate errors stay in the panel with the form intact

Any gate rejection (bad address, throttled resend, wrong or expired code, send failure, misconfiguration) SHALL render an inline error inside the panel with HTTP 4xx/5xx, preserving the form and the already-entered values so retry is one action.

#### Scenario: Wrong code

- **WHEN** a user submits an incorrect code
- **THEN** the panel keeps the code form with the email retained and shows the invalid-code error inline

### Requirement: Resend tells the wait

A throttled code resend SHALL state the remaining wait inline and the panel SHALL count it down to zero before allowing another send.

#### Scenario: Double request

- **WHEN** a user requests a code twice in a row
- **THEN** the panel shows the retry wait and re-enables sending when it elapses

### Requirement: Code entry is a 6-box input

The code form SHALL present six single-character boxes that auto-advance, split a pasted code across boxes, summon the numeric keyboard on phones, and submit only six digits.

#### Scenario: Paste the code

- **WHEN** a user pastes six digits into any box
- **THEN** all boxes fill and the form submits

### Requirement: Gate looks designed on a phone

Every gate step SHALL render as a composed mobile-first panel (clear heading, supporting line, input, primary action) with 44 px minimum tap targets and no horizontal scrolling at 360 CSS px, replacing the current bare text-and-input layout.

#### Scenario: First sight of the gate

- **WHEN** a gated user opens the app on a phone
- **THEN** the panel reads as a designed step with a heading, guidance, and a thumb-reachable action, not raw text and a bare input

### Requirement: Focus and announcements follow the step

The code form SHALL autofocus its first box on arrival, and step changes and inline errors SHALL be announced to screen readers via a polite live region.

#### Scenario: Code arrives

- **WHEN** the panel reaches sent
- **THEN** focus lands in the first code box and the step change is announced
### Requirement: Verified state confirms and moves on

A correct code SHALL establish the session and land the user on unlocked search immediately via reload. The reload is the confirmation.

#### Scenario: Correct code

- **WHEN** a user submits the current valid code
- **THEN** the session is established and the page reloads into unlocked search
