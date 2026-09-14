## Purpose

Declares that every outbound adapter must work from Workers egress, closing the two live-proven gaps (Spotify token flow, Tidal search) with runtime-universal primitives.

## Requirements

### Requirement: Spotify token flow works on edge

The Spotify anonymous-token flow (server time, player JS scrape, TOTP, token exchange) SHALL succeed on Workers using only universal primitives, with no `node:crypto` import in the adapter.

#### Scenario: Spotify search from the demo

- **WHEN** a client searches with `adapters: ["spotify"]` on the deployed worker
- **THEN** verified Spotify links return for tracks Spotify carries, matching self-host results for the same query

### Requirement: Tidal search works on edge or is a documented gap

The Tidal v2 search SHALL return results from Workers egress; if the 400 proves to be a Tidal-side restriction, the demo SHALL surface the same clear error shape as other adapter misses and the gap SHALL be documented like the Apple Music one was.

#### Scenario: Tidal search from the demo

- **WHEN** a client searches with `adapters: ["tidal"]` on the deployed worker
- **THEN** either verified Tidal links return or a documented, tested miss — never an unlogged 400 with a swallowed body
