## Purpose

Most public instance traffic is a phone on a chat link, so the search page must be fully usable one-handed at small widths with honest loading feedback.

## ADDED Requirements

### Requirement: Viewport stays accessible

The page SHALL NOT disable pinch-zoom or pin the scale; users keep full zoom control.

#### Scenario: Zoom on a result

- **WHEN** a user pinch-zooms a search card on a phone
- **THEN** the page zooms

### Requirement: Phone-first search and results
At 360 CSS px wide the search input, gate panel, and result cards SHALL be fully visible and tappable without horizontal scrolling, with tap targets at least 44 px.

#### Scenario: Full flow on a small phone

- **WHEN** a user pastes a link, verifies email, and opens results at 360 px
- **THEN** every step completes without horizontal scrolling or unreadable text

### Requirement: Actions share one button language

Form actions (search, gate, sample) SHALL share one 48 px height and border radius from a single shared style. Card actions (preview circle, share, copy) stay compact at their original height in the new style, so rows stay scannable.

#### Scenario: Scan the actions

- **WHEN** a user looks at search, gate, card, and sample actions together
- **THEN** form actions match each other, card actions match their old height, and no button overflows or crushes its label

### Requirement: Platform links fit above the fold

The platform list SHALL render as a compact tile grid (two columns on phones, three on desktop) with short names, per-tile copy, and clamped title and description, so a typical result needs no scrolling to scan.

#### Scenario: Six-platform result on a phone

- **WHEN** a song with six platform links renders at 360 px
- **THEN** links fit in three tile rows with truncated names, full text on title attributes, and copy per tile

### Requirement: Audio preview progress lives in the play button

The preview control SHALL be a circular play/stop button whose ring fills with playback progress, with no separate progress bar.

#### Scenario: Preview plays

- **WHEN** a user plays a preview
- **THEN** the icon toggles to stop and the button ring fills with progress, resetting at the end

### Requirement: Searches show skeleton loaders

While a search request is in flight the results area SHALL show a skeleton placeholder shaped like a result card instead of only a spinner, and it SHALL clear on swap (success or error).

#### Scenario: Slow upstream

- **WHEN** a user submits a link and the response takes seconds
- **THEN** a skeleton card stands where the result will land until content swaps in

### Requirement: Motion respects reduced-motion

Loading and transition motion (skeleton shimmer, swaps, countdowns) SHALL fall back to static states under `prefers-reduced-motion`.

#### Scenario: Reduced motion on

- **WHEN** a user with reduced-motion enabled waits on a search
- **THEN** the placeholder is static with no shimmer or animation
