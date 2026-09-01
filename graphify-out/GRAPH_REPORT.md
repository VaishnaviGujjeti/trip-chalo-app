# Graph Report - trip-chalo-phase1  (2026-09-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 219 nodes · 306 edges · 29 communities (17 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21532f0f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 24
- Community 25
- Community 26

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 22 edges
2. `compilerOptions` - 16 edges
3. `getCurrentUserId()` - 8 edges
4. `signUpAction()` - 8 edges
5. `createTripAction()` - 8 edges
6. `updateTripAction()` - 8 edges
7. `getTripById()` - 7 edges
8. `isSafeRedirectPath()` - 7 edges
9. `include` - 7 edges
10. `formatTripDateRange()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `getCurrentUserId()` --calls--> `createClient()`  [EXTRACTED]
  src/modules/auth/session.ts → src/lib/supabase/server.ts
- `createTripAction()` --calls--> `getCurrentUserId()`  [EXTRACTED]
  src/modules/trips/actions.ts → src/modules/auth/session.ts
- `getTripById()` --calls--> `createClient()`  [EXTRACTED]
  src/modules/trips/queries.ts → src/lib/supabase/server.ts
- `getTripById()` --calls--> `isTripId()`  [EXTRACTED]
  src/modules/trips/queries.ts → src/modules/trips/validation.ts
- `listMyTrips()` --calls--> `createClient()`  [EXTRACTED]
  src/modules/trips/queries.ts → src/lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (29 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.16
Nodes (15): metadata, metadata, TripsPage(), EditTripPage(), metadata, TripDetailPage(), getCurrentUserId(), initialState (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.20
Nodes (14): LoginPage(), AuthActionState, resolveSiteOrigin(), signInAction(), signUpAction(), initialState, LoginForm(), initialState (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.20
Nodes (18): createTripAction(), deleteTripAction(), emptyToNull(), logDatabaseError(), readTripFormValues(), TripActionState, tripColumnsFrom(), TripFormValues (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (19): next, dependencies, next, react, react-dom, @supabase/ssr, @supabase/supabase-js, name (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (19): dom, dom.iterable, esnext, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.28
Nodes (7): AppLayout(), GET(), AuthLayout(), Home(), createClient(), signOutAction(), SignOutButton()

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (9): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (6): auth.users, public.handle_new_user, on_auth_user_created, profiles_set_updated_at, public.profiles, public.set_updated_at

### Community 9 - "Community 9"
Cohesion: 0.28
Nodes (8): public.invitations, public.trip_members, public.accept_invitation(), public.decline_invitation(), public.is_trip_member(), public.is_trip_owner(), public.revoke_invitation(), public.trips

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (6): public, public.add_trip_owner_as_member, on_trip_created, public.trip_members, public.profiles, public.trips

### Community 11 - "Community 11"
Cohesion: 0.38
Nodes (5): AUTH_PREFIXES, PROTECTED_PREFIXES, updateSession(), config, proxy()

### Community 12 - "Community 12"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 13 - "Community 13"
Cohesion: 0.40
Nodes (4): public.trips, public.profiles, public.set_updated_at, trips_set_updated_at

### Community 14 - "Community 14"
Cohesion: 0.50
Nodes (3): public.invitations, public.profiles, public.trips

### Community 15 - "Community 15"
Cohesion: 0.50
Nodes (3): public.media, public.profiles, public.trips

### Community 16 - "Community 16"
Cohesion: 0.50
Nodes (3): public.messages, public.profiles, public.trips

## Knowledge Gaps
- **64 isolated node(s):** `TripFormProps`, `ValidationResult`, `TripFormValues`, `ValidationResult`, `metadata` (+59 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 106 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Community 5` to `Community 3`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `compilerOptions` connect `Community 4` to `Community 7`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `TripFormProps`, `ValidationResult`, `TripFormValues` to the rest of the system?**
  _64 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._