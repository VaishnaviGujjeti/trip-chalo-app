# Trip Chalo

Private shared travel-memory platform. Modular monolith on Next.js + Supabase + Cloudflare R2.

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase: Postgres, Auth, Realtime
- Cloudflare R2: original media storage
- Vercel: hosting

## Structure
```
src/
  app/            # Next.js routes (App Router)
  modules/        # Domain modules — one folder per bounded context
    auth/
    trips/
    memberships/
    invitations/
    media/
    storage/
    chat/
  lib/
    supabase/     # client.ts (browser) and server.ts (server) factories
```
Each module in `src/modules` will hold its own domain logic (types, queries,
server actions) so it can be extracted into a separate service later if
actually needed. Nothing goes in there yet — Phase 2 starts filling `trips`
and `auth`.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase + R2 keys.
3. `npm run dev`

## Status
Phase 1 complete: app foundation scaffolded, Supabase client/server helpers added.
Phase 2 (database schema) is next.
