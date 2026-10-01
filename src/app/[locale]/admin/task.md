# Tasks

## Database Schema Update
- [x] Define enums `UserRole`, `FlagStatus`, `FlagReason`, `FlagTargetType`, `FlagSeverity`, `AuditAction`, `AuditTargetType` in `schema.prisma`.
- [x] Add suspension, session versioning, and flag relations to the `User` model.
- [x] Add `AuditLog` model.
- [x] Add `FlaggedItem` and `Report` models with de-duplication constraints and claim/resolution metadata.
- [x] Add `StreamHealthLog` and `StreamDailyAggregate` models.
- [x] Push database updates using `npx prisma db push`.

## Backend Authorization & APIs
- [x] Create authorization helper middleware `middleware.ts` with `requireRole`, `requireAnyRole`, and `requirePermission`.
- [x] Create `/api/admin/stats` cached stats endpoint with invalidation hooks.
- [x] Create `/api/admin/users` pagination directory manager endpoint.
- [x] Create `/api/admin/flags` de-duplicated reports manager queue endpoint.
- [x] Create `/api/admin/system/health` live health checker monitor endpoint.
- [x] Create `/api/stream/analytics` rate-limited, validated video telemetry endpoint.

## Admin Front-End UI
- [x] Create server-side guarded `/admin` layout.
- [x] Create Dashboard home page with sign-up and stream latency charts.
- [x] Create User directory manager page with role edit and temporal suspension dates.
- [x] Create Moderation flags page with claim expiration selectors.
- [x] Create System Health settings page.
- [x] Modify `VideoPlayer.tsx` player to collect batched telemetry (stalls, load times, network types, browser environment) and emit on unload.

## Background Analytics Cron
- [x] Create nightly aggregation script `scripts/aggregate-analytics.ts` wrapping calculations and raw purging inside a single transaction.

## Verification & Tests
- [x] Write integration test runner `scripts/test-admin.ts` verifying session invalidation, duplicate report prevention, claim timeouts, aggregation transactions, and rate limiting.
- [x] Run test suite and confirm all assertions pass.
