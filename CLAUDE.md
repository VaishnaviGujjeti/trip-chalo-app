# CLAUDE

# Trip Chalo — Claude Project Instructions

## 1. Purpose

You are working on **Trip Chalo**, a private shared-memory/travel application.

This file is Claude’s **operating manual**. Keep it concise. Do not turn it into a duplicate of the project’s architecture, roadmap, or decision history.

**The actual repository is the ultimate source of truth.**

---

## 2. Project Knowledge

Use these documents according to their purpose:

- `TRIP_CHALO_MASTER.md` — long-term **WHAT**: product, architecture, stack, roadmap, permanent constraints.
- `TRIP_CHALO_CURRENT_STATE.md` — current **WHERE**: phase, verified work, Git checkpoint, tests, repository state, immediate next step.
- `TRIP_CHALO_DECISION_LOG.md` — historical **WHY**: architectural/security decisions, rationale, alternatives, status.
- `TRIP_CHALO_HANDOFF.md` — short-term **NEXT**: current task, relevant files, review targets, immediate next action.

### If sources disagree

Use this priority:

1. Actual repository/code/database state
2. Explicit current user instruction
3. `TRIP_CHALO_CURRENT_STATE.md`
4. `TRIP_CHALO_DECISION_LOG.md`
5. `TRIP_CHALO_MASTER.md`
6. `TRIP_CHALO_HANDOFF.md`

If documentation conflicts with the repository, **identify and verify the conflict**. Never silently choose a side.

---

## 3. Inspect Before Implementing

This is a strict rule.

Before changing code:

1. Inspect the actual relevant files.
2. Inspect related migrations, functions, triggers, RLS, and grants when database behavior is involved.
3. Inspect existing architecture and dependencies.
4. Check Git state/history when relevant.
5. Identify assumptions, conflicts, security implications, and missing capabilities.
6. Then propose or implement the change.

Never recreate a file from memory when the real file can be inspected.

Never assume previously generated code is still the repository’s current code.

---

## 4. Phase Workflow

Work only on the current phase unless explicitly authorized otherwise.

For each phase:

1. **Review** — inspect the real repository/database.
2. **Design** — identify files, schema/RLS implications, risks, tests, and scope.
3. **Approval** — if the phase requires design approval, stop and wait.
4. **Implement** — make the smallest correct change.
5. **Verify** — build, type-check, test, and perform relevant security/negative tests.
6. **Review** — inspect the final diff for scope creep, regressions, and unintended files.
7. **Document** — update Current State, Decision Log, and Handoff when appropriate.
8. **Commit** — only after verification and final review pass.

---

## 5. Security Principles

Treat these as high-priority constraints:

- PostgreSQL RLS is the primary authorization boundary.
- Never rely on frontend/UI authorization alone.
- Do not bypass RLS with a service-role client for normal user operations.
- Never expose service-role or R2 secret credentials to the browser.
- Treat authentication, sessions, redirects, invitations, memberships, and media access as security-sensitive.
- Never trust client-supplied ownership fields merely because the UI hides them.
- Validate security-sensitive input on the server.
- Do not reintroduce open redirects.
- Do not weaken existing RLS merely to simplify application code.
- If the current schema/RLS cannot safely support an operation, report the gap rather than inventing a bypass.

---

## 6. Established Authentication Architecture

Phase 3 established and verified:

- Next.js request interception uses `src/proxy.ts`.
- `src/proxy.ts` delegates to `src/lib/supabase/proxy.ts`.
- Obsolete middleware files were removed.
- Server-side protection currently uses `supabase.auth.getClaims()`.
- Do not use `getSession()` for server-side authorization.
- `getUser()` may be used when a fresh server-validated user record is specifically required; do not casually replace the established `getClaims()` protection pattern.
- Redirect targets are validated by `isSafeRedirectPath`.
- Auth email callback URLs use `NEXT_PUBLIC_SITE_URL` as the authoritative configured origin, with the established Vercel fallback.

Do not alter this architecture casually. Re-check current framework/library guidance before proposing security-sensitive changes.

---

## 7. Architecture Rules

- Keep Trip Chalo a modular monolith unless explicitly changed.
- Domain code belongs under `src/modules/<domain>/`.
- Prefer Server Components for appropriate server-side reads.
- Prefer Server Actions for appropriate form-driven mutations.
- Keep authorization in PostgreSQL/RLS rather than duplicating it only in application code.
- Reuse existing database capabilities before adding migrations.
- Avoid unnecessary dependencies and premature abstractions/infrastructure.
- Do not introduce public/social functionality unless explicitly approved.
- PostgreSQL stores application metadata/references; Cloudflare R2 stores media bytes as established by the architecture.
- Keep changes focused on the current phase.

---

## 8. Database Rules

Before changing the database:

1. Read the relevant existing migrations.
2. Determine the current schema, constraints, triggers, functions, indexes, RLS policies, and grants.
3. Determine whether the required behavior already exists.
4. Prefer existing correct capabilities.
5. If a migration is required, explain why before creating it.
6. Do not casually edit already-applied migrations; use a new migration for actual schema changes.
7. Verify both positive and negative authorization cases.

For user-owned resources, ownership must be securely derived from authenticated identity rather than trusted from arbitrary client input.

---

## 9. Context Management

Conversation history is temporary working context. **Project files are persistent project memory.**

Do not depend on a long conversation to remember architecture or decisions.

When context becomes large:

- preserve important decisions in the appropriate project document;
- keep handoff information concise;
- prefer a fresh session over dragging a huge conversation forward;
- have the next session read the relevant project documents and inspect the repository;
- do not repeatedly paste entire source files when Claude can inspect them directly.

Do not create multiple overlapping memory documents.

Never put secrets, API keys, passwords, tokens, or credentials into project memory files.

## 9.1 Graphify Codebase Context

Graphify is a generated structural map of the repository.

- `graphify-out/graph.json` is generated structural data.
- `graphify-out/wiki/` is generated, human/AI-readable code-relationship documentation.
- Graphify is supplementary context, not the source of truth.
- The actual repository/code/database remains authoritative.
- Do not treat Graphify output as authoritative when it conflicts with the repository.
- Graphify output may be stale after code changes; verify against the current repository.
- Use Graphify to understand relationships, dependencies, affected areas, and architectural hubs.
- Do not modify generated Graphify output manually.
- Do not use Graphify's Claude Code integration unless Claude Code is explicitly being used.
Claude.ai may use the generated Graphify documentation through the repository/GitHub integration, but Graphify itself is generated locally and is not assumed to be directly executable from Claude.ai.
---

## 10. Documentation Hygiene

Keep the project documents distinct:

| File | Purpose |
| --- | --- |
| `CLAUDE.md` | How Claude should operate |
| `TRIP_CHALO_MASTER.md` | Long-term WHAT |
| `TRIP_CHALO_CURRENT_STATE.md` | Current WHERE |
| `TRIP_CHALO_DECISION_LOG.md` | Historical/architectural WHY |
| `TRIP_CHALO_HANDOFF.md` | Short-term NEXT |

Do not copy entire documents into each other.

When a decision becomes obsolete, mark it **superseded** rather than silently deleting useful historical reasoning.

When verification status changes, update the status so future sessions do not mistake old uncertainty for current uncertainty.

---

## 11. Communication Rules

Be precise and evidence-driven. Distinguish:

- **VERIFIED** — directly observed/tested.
- **INFERRED** — logically concluded but not directly tested.
- **PROPOSED** — design suggestion not yet approved.
- **UNKNOWN** — requires inspection/testing.

Never claim to have run, inspected, or tested something you did not.

If a requirement conflicts with an existing decision, surface the conflict before making a consequential architectural change.

---

## 12. Current Phase — Phase 5

The current phase is **Phase 5 — Membership & Invitations**.

The first task is **review, not implementation**.

Before writing Phase 5 code, inspect the actual repository and database,
including the complete migration chain `0001`–`0009`, relevant RLS policies,
grants, functions, triggers, foreign keys, cascade behavior, Phase 4
authorization patterns, and the relevant application modules/routes.

The Phase 5 starting scope is a hypothesis, not an approved implementation
plan. Independently determine:

- membership lifecycle
- invitation lifecycle
- authorization boundaries
- existing database capabilities that can be reused
- whether any database change is genuinely necessary
- affected files/modules/routes
- validation and error behavior
- positive and negative two-user security verification
- implementation order and batch boundaries
- explicit Phase 5 boundaries and later-phase dependencies

Claude has freedom to challenge the proposed Phase 5 structure, scope,
implementation approach, file organization, or batching when the actual
repository/database supports a better, safer, simpler, or more maintainable
solution.

Do not implement until the Phase 5 review/design has been completed and
explicit approval is given.

---

## 13. Definition of Done

A phase is complete only when:

- implementation matches approved scope;
- security/authorization behavior is verified;
- build/type checks pass;
- relevant functional tests pass;
- relevant negative/security tests pass;
- final changes are reviewed;
- documentation reflects verified reality;
- Git has a clean, identifiable checkpoint.

---

## 14. Final Rule

**Inspect → reason → identify risks → propose → get approval when required → implement → verify → document → commit.**

Do not trade correctness, security, or project continuity for speed.

[TRIP_CHALO_HANDOFF](TRIP_CHALO_HANDOFF%203cc52de2850080658565ca7669a6206e.md)

[TRIP_CHALO_MASTER](TRIP_CHALO_MASTER%203ce52de2850080588e29f7a7ee3c572e.md)

[TRIP_CHALO_CURRENT_STATE](TRIP_CHALO_CURRENT_STATE%203cb52de2850080a8bc6bf88f2a384164.md)

[TRIP_CHALO_DECISION_LOG](TRIP_CHALO_DECISION_LOG%203cc52de2850080fcb834c10c0cb6cfd9.md)