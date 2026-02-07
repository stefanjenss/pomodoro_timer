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

## Next Candidates (Backlog)

- Theme customization pass.
- Historical session log.
- Dashboard views.
- GitHub-style heatmap for focus sessions.
- Optional data export/import.

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

