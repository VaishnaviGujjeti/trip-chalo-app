# Trip Chalo — Session Handoff

> **Purpose:** Short-lived bridge between development sessions. This document preserves the minimum verified context required for a fresh AI session to continue safely without relying on conversation history.
>
> **Authority:** This is a working handoff, not the ultimate source of truth. The repository, database, tests, and Git state must be verified before implementation. If this document conflicts with the repository, treat the repository as authoritative and record the discrepancy.

---

## 1. Session Metadata

- **Project:** Trip Chalo
- **Current Phase:** Phase 4 — Trips / Trip Lifecycle
- **Session status:** Phase 4 design/review stage
- **Last stable Git checkpoint:** `e5b39a8` — `Complete Phase 3 authentication`
- **Working tree at last verification:** CLEAN
- **Handoff updated:** 2026-08-23

---

## 2. Current Objective

Complete the **Phase 4 independent architecture/security review** before implementing anything.

The review must inspect the actual repository/database definitions relevant to trips and the Phase 3 authentication surface that Phase 4 depends on.

**No implementation is authorized by this handoff.**

---

## 3. Verified Project State

### Completed

- Phase 0 — Product + Architecture
- Phase 1 — Application Foundation
- Phase 2 — Database + Security Foundation
- Phase 3 — Authentication + User Identity

### Phase 3 verification

Reported and verified by the user:

- `npm run build` — PASS
- Signup + email confirmation — PASS
- Login/logout — PASS
- Protected `/trips` route — PASS
- Auth-page redirects — PASS
- Open-redirect protection — PASS
- Profile creation/integration through the Phase 2 trigger — PASS
- Git checkpoint committed as `e5b39a8`
- Working tree clean after commit

### Phase 4

- Not implemented.
- `src/modules/trips/` currently contains only `.gitkeep`.
- Existing `src/app/(app)/trips/page.tsx` is still the Phase 3 placeholder.
- No Phase 4 tests have been created.

---

## 4. Current Architecture Facts

These are known project decisions, but must still be checked against the repository before relying on them:

- Next.js 16.3.1 uses `src/proxy.ts` rather than the deprecated `middleware.ts` convention.
- Supabase SSR protection uses `getClaims()` rather than `getSession()`.
- Supabase RLS is the authorization boundary.
- Normal application operations must not use the service-role key.
- Client input must never determine ownership/security-sensitive identifiers.
- Phase 2 migrations `0001`–`0008` are considered completed and should not be changed unless the review identifies a genuine blocking defect.
- Phase 3 authentication is the dependency for Phase 4 protected app routes.

---

## 5. Phase 4 Review Scope

Inspect:

```text
supabase/migrations/0002_trips.sql
supabase/migrations/0003_trip_members.sql
supabase/migrations/0007_rls_policies.sql
supabase/migrations/0008_grants.sql

src/app/(app)/layout.tsx
src/app/(app)/trips/page.tsx
src/lib/supabase/server.ts
```

Also consult the project-level architecture/state/decision documents as relevant.

### Review questions

1. Is the existing `trips` schema sufficient for lifecycle CRUD?
2. How does owner auto-membership work?
3. Are trip SELECT/INSERT/UPDATE/DELETE operations correctly protected by RLS?
4. Are existing grants sufficient?
5. What authorization belongs in application code versus the database?
6. What should happen for non-members requesting a trip?
7. What should happen when an unauthorized user attempts update/delete?
8. What validation is appropriate?
9. What cache/revalidation behavior is required?
10. What are the consequences of hard deletion and cascades?
11. Are any database changes genuinely necessary?
12. What is the smallest clean implementation that fits the existing architecture?
13. What should explicitly remain for Phase 5 or later?
14. Are there any Next.js/Supabase/security compatibility concerns?

---

## 6. Expected Phase 4 Shape

Do **not** treat this as an approved implementation plan. It is only a starting hypothesis to challenge during review.

Likely lifecycle:

```text
Create
  ↓
List my accessible trips
  ↓
View trip
  ↓
Edit (owner)
  ↓
Delete (owner)
```

Likely implementation areas:

```text
src/modules/trips/
├── validation.ts
├── queries.ts
├── actions.ts
└── components/

src/app/(app)/trips/
├── page.tsx
├── new/page.tsx
└── [tripId]/
    ├── page.tsx
    └── edit/page.tsx
```

The reviewer may change this structure if a better architecture is justified.

---

## 7. Security Invariants

Do not weaken these without explicit architectural approval:

- RLS remains the final authorization boundary.
- Never accept `owner_id` from client form data.
- Derive the authenticated user from the trusted server-side auth context.
- Do not use service-role access to bypass RLS for normal trip CRUD.
- Do not expose whether a user is a member of an inaccessible trip when the correct behavior is a not-found response.
- Do not introduce open redirects, privilege escalation, IDOR, or authorization bypasses.
- Do not silently alter completed Phase 2/3 security behavior.

---

## 8. Verification Required Before Implementation Approval

The Phase 4 design review should produce:

- findings
- recommended architecture
- exact files to create/modify
- database-change decision
- security/edge-case analysis
- implementation order
- testing strategy
- explicit Phase 4 boundaries

Then **STOP and wait for approval**.

No code should be changed merely because this handoff exists.

---

## 9. Session History / Changes This Session

### Completed this session

- Reconciled the state document after confirming `supabase/middleware.ts` was deleted.
- Confirmed there are no remaining Phase 3 middleware cleanup items.
- Established the persistent-context/handoff workflow for future Claude sessions.

### Files intentionally not changed during Phase 4 review

No Phase 4 source implementation has been authorized.

---

## 10. Known Issues / Deferred Work

These are not Phase 4 blockers unless the review proves otherwise:

- Password reset flow is not implemented.
- Ownership transfer does not exist.
- Owner cannot currently leave their own trip because ownership transfer is not implemented.
- Invitation acceptance/member creation has database support but no UI; planned for Phase 5.

Do not expand Phase 4 scope to solve these unless a dependency requires it and the user approves the change.

---

## 11. Exact Next Action

**Perform the independent Phase 4 repository/database/RLS review.**

After the review:

1. Present findings.
2. Present the recommended architecture.
3. Identify any required changes.
4. Wait for explicit approval.
5. Only then begin implementation in small, verified increments.

---

## 12. Fresh-Session Instructions for AI

If this file is being read at the start of a new session:

1. Read `CLAUDE.md`.
2. Read `TRIP_CHALO_CURRENT_STATE.md`.
3. Read this handoff.
4. Read only the relevant sections of `TRIP_CHALO_MASTER.md` and `TRIP_CHALO_DECISION_LOG.md`.
5. Verify critical claims against the repository/Git/database.
6. Do not rely on the previous conversation for missing facts.
7. Do not implement until the current objective explicitly authorizes implementation.
8. At the end of a substantial session, update the state and handoff so the next session can continue without reconstructing the conversation.

---

## 13. Handoff Lifecycle

This file should be **replaced/updated**, not endlessly appended.

Update it when:

- a logical feature is completed;
- a major architectural decision is made;
- a verification milestone is reached;
- a session is approaching context limits;
- `/clear` will be used;
- a phase is completed.

Keep historical reasoning in `TRIP_CHALO_DECISION_LOG.md`, not here.
Keep long-term architecture in `TRIP_CHALO_MASTER.md`, not here.
Keep current verified project status in `TRIP_CHALO_CURRENT_STATE.md`.

**Goal:** A fresh AI session should be able to understand *where we are, what was verified, what matters, and exactly what to do next* without replaying the previous conversation.
