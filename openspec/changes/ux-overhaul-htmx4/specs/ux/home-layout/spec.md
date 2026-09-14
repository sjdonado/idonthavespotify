## Purpose

The home page must feel like a search engine: an inviting centered hero first, a compact working header once there is something to show.

## ADDED Requirements

### Requirement: Landing is a centered hero

With no result present the title and search SHALL sit vertically centered as a hero, with the sample-track button beneath the search bar.

#### Scenario: Fresh open

- **WHEN** a user opens the app with no search
- **THEN** title and search are centered in the viewport with the try-it action visible

### Requirement: Results compact the header

Once a result or an error is present the layout SHALL move to a compact top header, keeping the same title, copy, colors, and typeface.

#### Scenario: Search completes

- **WHEN** a search returns from the hero
- **THEN** the header compacts to the top and the card shows below, identity unchanged

### Requirement: Sample button lives only in the empty state

The sample-track button SHALL appear only while no result is present and disappear with the first search.

#### Scenario: First search

- **WHEN** a user runs any search from the hero
- **THEN** the sample button is gone when results land

### Requirement: Sample track runs a real search

The try-it button SHALL fill the search with a hardcoded song link and submit it as a normal search.

#### Scenario: No link at hand

- **WHEN** a user clicks the sample-track button
- **THEN** a real search runs for the sample song and the header compacts
