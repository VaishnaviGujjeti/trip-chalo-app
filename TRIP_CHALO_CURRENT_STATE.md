## How to use this document

This file is a verified-state snapshot, not a substitute for the repository.

At the start of a new session:
1. Read this file.
2. Verify important claims against the actual repository.
3. Inspect only the files relevant to the current task.
4. Do not assume this document is correct if the repository contradicts it.
5. Update this file after completing a meaningful implementation milestone.

# TRIP CHALO — CURRENT STATE

> Snapshot as of the end of the Phase 3 verification conversation.
> This is CONTEXT, not fact. Before doing anything, verify against the real
> repository: `git log`, `git status`, `npm run build`, and the actual
> Supabase project — not this file.

---

## Current phase

**Phase 4 — Trips / Trip Lifecycle.**
Phase 3 is complete and verified. Next step: an independent Phase 4
repository/database/RLS review before any implementation begins.

---

## Completed phases

| Phase | Status | Basis |
|---|---|---|
| 0 — Product + Architecture | ✅ Decided | Established in the original master handoff prompt |
| 1 — Application Foundation | ✅ VERIFIED by user | User stated "Phase 1 is complete and pushed to the correct GitHub repository" at the start of the Phase 2 request. Local path given: `D:\project\trip-chalo-phase1`. |
| 2 — Database + Security Foundation | ✅ VERIFIED by user | User stated "Migrations 0001–0008 are restored and applied," "RLS enabled and verified on all six [tables]," "RLS policies and required functions verified" at the start of the Phase 3 request. |
| 3 — Authentication + User Identity | ✅ COMPLETE AND VERIFIED | `npm run build` PASSED. Full manual test sequence PASSED: signup/email confirmation, login/logout, protected `/trips` route, auth-page redirects, open-redirect protection, profile creation/integration. Committed as `e5b39a8` — "Complete Phase 3 authentication". `git status --short` reported CLEAN. |
| 4 — Trips / Trip Lifecycle | 🔄 Current phase, not yet started | Independent repository/database/RLS review is the agreed next step before implementation. |
| 5–11 | Not started | — |

---

## Current Git checkpoint

- **Commit:** `e5b39a8`
- **Message:** "Complete Phase 3 authentication"
- **Working tree:** CLEAN (`git status --short` reported no output)

This is the current stable checkpoint. Any Phase 4 work should branch
forward from here.

---

## Verified tests

All reported PASSED by the user for Phase 3:
- `npm run build`
- Signup / email confirmation flow
- Login / logout
- Protected `/trips` route (redirect when unauthenticated)
- Auth-page redirects (authenticated user redirected away from `/login`,
  `/signup`)
- Open-redirect protection (`redirectTo` / `next` validated against
  external targets)
- Profile creation/integration (Phase 2's `handle_new_user` trigger
  confirmed firing correctly under real Phase 3 code, producing a matching
  `profiles` row on signup)

No Phase 4 tests exist yet — nothing to verify until implementation begins.

---

## Current repository state

```
src/
├── proxy.ts
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (app)/
│   │   ├── layout.tsx
│   │   └── trips/page.tsx
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── auth/
│       └── callback/route.ts
├── lib/
│   └── supabase/
│       ├── client.ts
│       ├── proxy.ts
│       └── server.ts
└── modules/
    ├── auth/
    │   ├── actions.ts
    │   ├── validation.ts
    │   └── components/
    │       ├── LoginForm.tsx
    │       ├── SignOutButton.tsx
    │       └── SignupForm.tsx
    ├── chat/.gitkeep
    ├── invitations/.gitkeep
    ├── media/.gitkeep
    ├── memberships/.gitkeep
    └── trips/.gitkeep
supabase/
├── .gitignore
├── config.toml
└── migrations/
    ├── 0001_profiles.sql … 0008_grants.sql
```

Confirmed architecture in active use:
- `src/proxy.ts` + `src/lib/supabase/proxy.ts` (Next.js 16 proxy
  convention, not the deprecated `middleware.ts`)
- `getClaims()` for all server-side page/data protection
- Existing Phase 2 migrations 0001–0008, unmodified
- No Phase 4 implementation yet — `trips` module folder still only contains
  `.gitkeep`

Deleted (confirmed): `src/middleware.ts`, `src/lib/supabase/middleware.ts`,
`src/modules/auth/types.ts`, `supabase/middleware.ts`.

The previously open question about `supabase/middleware.ts` (old duplicate
`updateSession` implementation) is resolved — user confirmed it has been
deleted. No outstanding file-cleanup items remain from Phase 3.

---

## Current work / next step

**Independent Phase 4 repository/database/RLS review, before any
implementation.** This should re-inspect the actual current state of:
- `trips` table RLS policies and grants (from migrations 0002 + 0007 + 0008)
- Existing `trip_members` owner-auto-membership trigger behavior
- Any Phase 3 auth/session code that Phase 4 pages will depend on
  (`getClaims()`, the `(app)` layout's auth gate)

...before writing any trip-creation/listing/update code, per the project's
standing "inspect before implementing" rule.

---

## Known gaps / issues

- **Password reset flow: not built.** Explicitly out of Phase 3 scope, not
  an oversight. Still no decision on which phase it belongs to.
- **Ownership transfer: does not exist.** The trip owner's `trip_members`
  row is currently undeletable by design (no transfer mechanism), meaning an
  owner cannot currently leave their own trip. Unchanged since Phase 2.
- **`invitee_id` resolution / membership creation on accept:** implemented
  in `accept_invitation()` (Phase 2, migration 0007) but has no UI yet —
  scheduled for Phase 5.

---

## Important recent decisions (see `TRIP_CHALO_DECISION_LOG.md` for full detail)

- `middleware.ts` → `proxy.ts` rename, forced by Next.js 16.2+ no longer
  discovering `middleware.ts` at all — now confirmed working via passing
  build and manual tests, not just generated.
- `getUser()` → `getClaims()` for all page/data protection checks, per
  Supabase's current documented SSR guidance — now confirmed working.
- Open-redirect guard (`isSafeRedirectPath`) for both the login
  `redirectTo` param and the `/auth/callback` `next` param — now confirmed
  working (explicitly tested and PASSED).
- `emailRedirectTo` origin resolution hardened to use `NEXT_PUBLIC_SITE_URL`
  as authoritative, `VERCEL_URL` as fallback, never the request `Origin`
  header — now confirmed working (signup/email confirmation PASSED).

---

## What must happen before moving past Phase 4 into Phase 5

Not yet applicable — Phase 4 has not started. This section will be updated
once Phase 4 implementation begins and its own completion criteria are
defined.
