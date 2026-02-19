# Pomodoro Timer Project Journey

This is a living document for tracking how the app evolves over time.

## Project Goal

Build a local-first pomodoro timer that can run in constrained environments (including locked-down work machines), starting simple and expanding into richer analytics over time.

## Environment Notes

- Primary implementation target: single-page web app.
- Current distribution mode: local HTML file (`file://`).
- Development recommendation: also test on `localhost` for browser APIs that need secure context.

## V1 Baseline (Initial Scope)

### Product Scope

- Preset cycles:
  - `25/5` (work/break)
  - `50/10` (work/break)
- Manual timer flow:
  - Start / Pause
  - Reset current phase
  - Manual switch phase
- End-of-phase feedback:
  - In-page visual signal
  - Beep (when browser allows)
  - Desktop notification attempt
- Local persistence:
  - Preset selection
  - Completed work/break counters
- Accessibility and UX:
  - Keyboard shortcuts (`Space`, `R`, `S`)
  - Responsive layout

### Technical Approach

- Single-file app in `/Users/stefanjenss/code/projects/pomodoro_timer/index.html`.
- Stack:
  - HTML for structure
  - CSS for styling
  - Vanilla JavaScript for state and timer logic
- Timing model:
  - Interval-based rendering with elapsed-time correction using epoch timestamps.

## Timeline / Change Log

## 2026-02-06

### Initial Build

- Created first working version of the pomodoro app in `index.html`.
- Implemented local storage for user preset and session counters.
- Added notification permission flow and notification dispatch logic.

### Feature Additions

- Added dynamic browser tab title showing remaining time:
  - `Pomodoro Timer (MM:SS)`
- Added animated progress bar synced to phase progress:
  - Fills as time elapses in current phase.
  - Uses different color treatment for work vs break.
- Changed phase behavior at `00:00`:
  - App now auto-switches to next phase.
  - Next phase remains paused (user must click Start).

### Bug Fixes

- Fixed notification status display not updating correctly after permission prompt.
- Improved notification status handling for local-file context:
  - Shows explicit message when `file://` context limits desktop notifications.

## Known Constraints and Decisions

- Desktop notifications may not work reliably from `file://` due to browser security context restrictions.
- Recommended dual workflow:
  - Build/test on `localhost`.
  - Keep `file://` compatibility for work-machine usage.

## 2026-02-07

### Summary

- Major V2 release with 10 improvements: dark mode, custom timers, sound customization, long breaks, session history, data export/import, favicon, localStorage safety, tick optimization, and test coverage.
- Extracted JavaScript into a separate `pomodoro.js` file to enable unit testing.

### Features

- Added: Dark mode with three-way toggle (system/light/dark), respects `prefers-color-scheme`.
- Added: Custom timer durations via a third "Custom" preset button with configurable work/break minutes (1-120 / 1-60).
- Added: Sound customization with 4 tone options (single beep, gentle chime, double beep, descending tone, none) and volume slider.
- Added: Long break support — configurable longer break (default 15 min) automatically triggered every N work sessions (default 4).
- Added: Session history with timestamped records, today's summary (work count, break count, focus minutes), and a collapsible 7-day view.
- Added: JSON data export/import for backup and migration across browsers.
- Added: Dynamic SVG favicon that changes color based on current phase (red for work, green for break).
- Updated: Timer tick interval reduced from 250ms to 1000ms for better battery efficiency. Elapsed-time correction preserves accuracy.
- Updated: All `localStorage.setItem`/`getItem` calls wrapped in `safeSetItem`/`safeGetItem` with try/catch for private browsing and quota handling.
- Updated: CSS hardcoded colors replaced with CSS custom properties (`--surface`, `--track-bg`, `--track-border`) for theme support.

### Decisions

- Decision: Extract JS to `pomodoro.js` rather than keeping everything inline.
- Reason: Enables shared loading from both `index.html` and `tests.html`. Still works from `file://` with no build step.
- Decision: Use conditional test export (`window.__POMODORO_TEST_HARNESS__`) rather than always exposing internals.
- Reason: Zero global leakage in production; test file sets the flag before loading the script.

### Follow-ups

- Next: GitHub-style heatmap for focus sessions.
- Next: Dashboard views with charts.

## 2026-02-19

### Summary

- Added a simple cross-platform local-run workflow so coworkers can launch the app via `http://localhost` instead of opening `index.html` directly.
- Improved operational safety so closing the terminal also stops the local server automatically.

### Features

- Added: `/Users/stefanjenss/code/projects/pomodoro_timer/RUN_THIS.sh` for macOS/Linux one-command startup (`./RUN_THIS.sh [port]`).
- Added: `/Users/stefanjenss/code/projects/pomodoro_timer/RUN_THIS.command` for macOS double-click launch.
- Added: `/Users/stefanjenss/code/projects/pomodoro_timer/RUN_THIS.bat` for Windows double-click launch.
- Added: `/Users/stefanjenss/code/projects/pomodoro_timer/RUN_LOCALLY.md` with teammate-focused setup and usage instructions.

### Fixes

- Fixed: local server lifecycle handling in `/Users/stefanjenss/code/projects/pomodoro_timer/RUN_THIS.sh` so the spawned `http.server` process is tied to terminal lifecycle.
- Fixed: server cleanup on terminal close or signal by trapping `EXIT`, `INT`, `TERM`, and `HUP`, preventing accidental background server processes.

### Decisions

- Decision: use Python's built-in `http.server` as the runtime path for sharing locally.
- Reason: zero project dependencies, works in constrained environments, and enables browser notification permissions that are blocked in `file://` contexts.

## Next Candidates (Backlog)

- Dashboard views.
- GitHub-style heatmap for focus sessions.

## Entry Template (Append for New Updates)

Copy/paste this block for each future update.

```md
## YYYY-MM-DD

### Summary

- Short summary of what changed.

### Features

- Added:
- Updated:

### Fixes

- Fixed:

### Decisions

- Decision:
- Reason:

### Follow-ups

- Next:
```
