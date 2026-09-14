## Purpose

New UX must never cost speed: the app stays as fast as 1.8.3 while looking and feeling dramatically better, with budgets a check can enforce.

## ADDED Requirements

### Requirement: Server latency parity

Search, gate, and page endpoints SHALL keep loopback p50 latency within noise of the 1.8.3 baseline (sub-millisecond renders), measured with the same protocol as the recorded baseline.

#### Scenario: Parity check

- **WHEN** the change's endpoints are benchmarked against the 1.8.3 baseline figures
- **THEN** no endpoint regresses beyond measurement noise

### Requirement: First-party JS weight capped

Total first-party JavaScript SHALL NOT exceed the 1.8.3 baseline weight (95 KB min), since the custom toaster replaces Notyf rather than adding to it.

#### Scenario: Bundle audit

- **WHEN** production assets are built
- **THEN** first-party JS is at or below baseline weight

### Requirement: No new render-blocking third parties

The change SHALL add no new render-blocking third-party requests; htmx stays on a pinned versioned CDN URL with an integrity hash, and all first-party behavior ships in the existing bundles.

#### Scenario: Fresh page load audit

- **WHEN** the home page loads
- **THEN** every render-blocking request is either first-party or a pinned, integrity-checked CDN URL already present in 1.8.3
