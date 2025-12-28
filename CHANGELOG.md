# Changelog

## Unreleased

- Feat: Move tournament creation and management UIs into Admin/Gestore dashboards (`/dashboard/admin/tornei`, `/dashboard/gestore/tornei`). Public pages are read-only.
- Fix: Enforce server-side role checks for mutative tournament operations and participant management (Admin/Gestore/Maestro rules).
- Fix: Responsive/layout polish across homepage, tournaments list, tournament detail and bookings pages (spacing, grid gaps, container widths).
- Feat: Bracket auto-refresh on tournament detail page to reflect recent participant changes.
- Test: Updated and extended unit tests for tournament permissions and participant flows (all tests passing).

Suggested commit messages:

"feat(tournaments): move management to dashboards, enforce server-side permissions"
"fix(ui): responsive spacing and bracket auto-refresh"
"test: tournament permission tests updated"
