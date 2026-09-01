# TRIP_CHALO_MASTER

# TRIP CHALO — MASTER PROJECT KNOWLEDGE

> This document is CONTEXT, not absolute truth. Before implementing anything,
inspect the actual repository (code, migrations, `package.json`, Git state).
Treat the repo as the source of truth over this document. If this document
and the repo disagree, flag the contradiction — do not silently pick one.
> 

---

## 1. Project purpose

Trip Chalo is a private, shared travel-memory platform for groups (friends/family)
who travel together. It solves the problem of trip media being scattered across
individual phones, compressed by chat apps, and disconnected from who
captured what and when.

Core statement: **create a private, high-quality, chronological memory of a
trip that belongs to the people who experienced it.**

Not a public social network. No public trip discovery. No feed. No followers.

Priority order for the product and every technical decision within it:

**Correctness → Security → Maintainability → Reliability → UX → Performance → Scale**

---

## 2. Architecture

**Modular monolith**, not microservices. One Next.js application with clearly
separated domain modules under `src/modules/`:

```
auth · trips · memberships · invitations · media · storage · chat
```

Rationale: greenfield project, no current scale requirement that justifies
microservice operational overhead. Modules are separated so any one of them
*could* be extracted later if an actual bottleneck justifies it — extraction
is a future option, not a current plan.

Media storage boundary (non-negotiable, stated repeatedly across phases):
- **PostgreSQL** = metadata + relationships + storage references only.
- **Cloudflare R2** = actual original photo/video bytes.
- Never store media files in Postgres.

---

## 3. Technology stack

Confirmed from the user’s actual environment during Phase 3 review:

| Layer | Choice | Verified version |
| --- | --- | --- |
| Framework | Next.js, App Router, `src/` layout | 16.3.1 |
| UI | React | 19.2.8 |
| Language | TypeScript | 5.9.3 |
| Runtime | Node | 22.20.0 |
| Styling | Tailwind CSS | as scaffolded by `create-next-app`, version not independently re-verified since Phase 1 |
| DB/Auth/Realtime | Supabase | `@supabase/ssr` 0.12.4, `@supabase/supabase-js` 2.112.3 |
| Object storage | Cloudflare R2 | not yet integrated (Phase 6) |
| Hosting | Vercel | not yet deployed |
| Source control | GitHub | repo exists, user confirmed baseline pushed after Phase 1 |

Cost constraint: **stay as close to ₹0/month as possible** for as long as
possible. Vercel Hobby, Supabase free tier, Cloudflare R2 free tier (10GB,
zero egress fees), GitHub free. This was an explicit project requirement,
not just a suggestion — check cost implications before introducing any paid
service or tier upgrade.

---

## 4. Complete phase roadmap (Phase 0–11)

This is the full roadmap as originally defined. There is no Phase 12 — the
roadmap runs Phase 0 through Phase 11.

| Phase | Name | Scope |
| --- | --- | --- |
| 0 | Product + Architecture | Product definition, stack selection, architecture decisions (this document’s §1–3) |
| 1 | Application Foundation | Next.js + TypeScript scaffold, project structure, Supabase client/server helper files |
| 2 | Database + Security Foundation | Schema, migrations, RLS, grants, SECURITY DEFINER functions |
| 3 | Authentication + User Identity | Signup/login/logout, session persistence, protected routes, profile integration |
| 4 | Trips | Create/view/update/hard-delete trips |
| 5 | Membership & Invitations | Invitation UI wired to `accept/decline/revoke_invitation`, membership management UI |
| 6 | Media | R2 integration, upload flow, metadata pipeline, chronology-based timeline UI |
| 7 | Chat | Trip chat UI, Supabase Realtime wiring |
| 8 | UX Refinement | Responsive layout, loading/empty/error states, upload progress, navigation polish |
| 9 | Testing & Security | Unit/integration/E2E tests, authorization test suite |
| 10 | Deployment | Vercel + Supabase + R2 production configuration |
| 11 | Performance & Scale | Only after MVP works and real bottlenecks are identified |

---

## 5. Phase boundaries — explicitly OUT of MVP scope

Stated once at project kickoff, still in force unless explicitly revisited:

- Public social feed, public profiles, followers/following, public trip discovery
- AI features of any kind (auto-organization, summaries, semantic search) — **not until Phase 11 at the earliest, and only if explicitly revisited**
- Payments/subscriptions — architecture should not preclude adding this later, but no payment code now
- Microservices, Kubernetes, Kafka, Redis, multi-database setups, complex event buses
- Native mobile app
- Advanced video editing, complex social features (reactions, stories, voice/video calls)

---

## 6. Core security/engineering principles (apply to every phase)

1. **RLS + explicit Data API grants are both required.** RLS restricts which
rows a role can touch; grants restrict whether the role can reach the
table at all. Neither substitutes for the other. `anon` gets no grants on
any private application table.
2. **Authorization is enforced at the database level**, never solely in
frontend/client code.
3. **`trip_members` is the single source of truth** for “can this user see
this trip’s data.” Every other table’s access policy ultimately reduces
to a membership check.
4. **Never allow direct client-side membership insertion.** A user must not
be able to add themselves to an arbitrary trip. Membership rows are only
created by a trigger (trip creation → owner) or a controlled
`SECURITY DEFINER` function (invitation acceptance).
5. **`SECURITY DEFINER` functions must set `search_path = ''`**, fully
qualify every table reference, and have `EXECUTE` explicitly
revoked-then-granted only to the roles that legitimately call them.
6. **For server-side authorization, use the project's established trusted auth
pattern rather than relying on an unvalidated session object.** The current
application protection pattern uses `getClaims()` as established in Phase 3.
Use `getUser()` only when a fresh server-validated user record is specifically
required by the operation. Re-check current Supabase guidance before making
future authentication architecture changes.
7. **Never expose the Supabase service-role key or R2 secret key** to the
browser, or ask the user to paste them into a session.
8. **Redirect targets from request input must be validated** as safe
internal paths before being used (open-redirect prevention).
9. **Capture time and upload time are distinct and must never overwrite each
other.** Chronology is a stated differentiating product feature, not an
incidental detail.
10. **Build the smallest correct version first.** Don’t add fields, roles,
or infrastructure “because it might be useful someday.”

---

## 7. Stable architectural decisions (should not be silently redesigned)

- Next.js (App Router, `src/` dir) + TypeScript + Tailwind
- Supabase for Postgres + Auth + Realtime
- Cloudflare R2 for original media, zero-egress-fee rationale explicit
- Vercel for hosting
- Modular monolith, module folders under `src/modules/`
- Six core tables: `profiles`, `trips`, `trip_members`, `invitations`,
`media`, `messages` — see `TRIP_CHALO_DECISION_LOG.md` for the reasoning
behind each
- RLS + explicit Data API grants are the authorization boundary; normal
application operations must not bypass RLS through service-role access
- Server-side application protection uses the trusted Supabase auth context,
currently `getClaims()` as established in Phase 3; future changes should be
re-verified against current Supabase guidance
- Email-targeted invitations (not user-ID-targeted), since the invitee may
not have an account yet
- Owner membership row is currently **undeletable** — no ownership-transfer
mechanism exists yet; this is a known, intentional limitation, not an
oversight

### Codebase Structural Analysis

Trip Chalo may use Graphify as a supplementary codebase-structure and
dependency-analysis tool.

Graphify is not an architectural authority and does not replace repository
inspection, database inspection, tests, or the project's persistent
documentation.

Any change to these should be flagged explicitly (what’s changing, why,
alternatives considered, impact) before being implemented, per the
project’s original operating principle.