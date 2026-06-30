# Phase 1 – CI Recovery

## Goal
Restore a fully passing CI pipeline without changing runtime behavior.

## Checklist
- `npm ci` succeeds
- `npm run lint` succeeds
- `npm run build` succeeds
- No runtime behavior changes (manual diff check)
