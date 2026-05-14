# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production (runs vite build + scripts/patch-sw.cjs)
npm run preview      # Preview the production build locally
npm run typecheck    # TypeScript type-check without emitting files
```

No test suite is configured. Use `npm run typecheck` to catch errors before committing.

The `@` alias maps to `./src` (configured in `vite.config.ts`).

## Architecture Overview

### Multi-tenant SaaS on Supabase

This is a **React + TypeScript + Vite** SPA deployed on Vercel, backed by Supabase (PostgreSQL + Auth + Realtime). All business data is scoped to a **tenant** (empresa). The central data model is `app_store` — a generic key/value JSONB table used by most contexts — plus the dedicated `tarefas` table for the Kanban module.

### Context Provider Stack (main.tsx)

The provider nesting order matters — each context may depend on the ones above it:

```
ThemeProvider
└── AuthProvider                  # Supabase auth session, User object, role
    └── TenantProvider            # Active tenant, member list, invite management
        └── SettingsProvider      # App config (imposto, tarifas, etc.)
            └── CanaisProvider    # Sales channels
                └── ProductProvider
                    └── MaterialProvider
                        └── AcessorioProvider
                            └── HardwareProvider
                                └── PedidosProvider
                                    └── ToastProvider
                                        └── PermissionsProvider
                                            └── TarefaProvider
                                                └── TourProvider
                                                    └── App
```

### Data Persistence — Two Patterns

**1. `app_store` (most contexts):** A single Supabase table with `key TEXT`, `tenant_id UUID`, `value JSONB`. Each context saves/loads its entire state as a single JSON blob using `dbGet(key)` / `dbSet(key, value)` from `src/lib/db.ts`. When `_activeTenantId` is set, queries filter by `tenant_id`; otherwise they fall back to `user_id` (legacy single-user mode).

**2. `tarefas` table (Kanban):** A proper relational table with individual rows per task. `TarefaContext` queries it directly via `supabase.from('tarefas')` and subscribes to Supabase Realtime (`postgres_changes`) so all team members see updates instantly.

### User Roles & Permissions

- **`developer`** — superadmin, bypasses all RLS and permission checks, sees DeveloperPanel
- **`owner`** — full access within their tenant
- **`admin`** — configurable via `PermissionsContext` (matrix stored in `app_store`)
- **`operador`** — configurable via `PermissionsContext`

Role is read from `user.app_metadata.role` (set server-side). The `can(permission)` hook from `PermissionsContext` is the correct way to gate UI features — never check `user.role` directly in components.

### Authentication Flow

1. Supabase Auth with email/password and Google OAuth (PKCE flow)
2. **Invite-gate**: new users require a valid `invites` table code. The RPC `get_invite_info(code)` is `SECURITY DEFINER` and callable by `anon`, so unauthenticated users can validate a code before signing up. Google OAuth checks `gestao3d_pending_google_invite` in localStorage.
3. After auth: `TenantProvider` loads memberships. If none found → `OnboardingTenant` (skipped for `developer` role).
4. `adoptLegacyData()` in `AuthContext` migrates pre-multitenancy data on first login.

### Supabase SQL Functions (Security Definer)

Critical RPCs in `supabase/migrations/`:
- `create_tenant_for_user` — creates tenant + membership atomically (bypasses RLS)
- `get_tenant_members_info` — returns member names/emails (reads `auth.users`)
- `get_invite_info` — public (anon-accessible) invite lookup
- `generate_invite_code` — generates 8-char alphanumeric code
- `get_invite_stats` / `get_invite_stats_for_tenant` — invite usage analytics

### Important Conventions

**Column naming:** The Supabase schema uses `snake_case` Portuguese names (`atualizado_em`, `tenant_id`, `criado_em`). TypeScript types use `camelCase`. Every context has a local `mapX()` function that translates.

**`tarefas` trigger:** The generic `set_updated_at()` trigger doesn't work on `tarefas` because the column is `atualizado_em`, not `updated_at`. The dedicated function `set_tarefas_atualizado_em()` handles this — see `fix_tarefas_trigger.sql`.

**Offline support:** `dbSet()` enqueues writes to IndexedDB (`offlineQueue`) when `navigator.onLine` is false. The queue is flushed on the `online` event in `main.tsx` via `flushOfflineQueue()`.

**PWA:** `public/sw.js` is a manually maintained service worker. `scripts/patch-sw.cjs` injects a build timestamp after `vite build` to bust the SW cache on each deploy. Do not rely on Vite plugins for SW invalidation.

**Lazy loading:** Heavy modals (`ProductModal`, `EditProductModal`, `NovaModal`, `ImportModal`) are loaded via `React.lazy()`. Code splitting is configured in `vite.config.ts` under `manualChunks`.

**Hard reset escape hatch:** Navigating to `?reset=1` or `#reset` triggers `hardReset()` which clears all localStorage/sessionStorage and reloads. Useful when a user's local state is corrupted.

### New Supabase Tables

Starting October 2025, Supabase requires explicit `GRANT` statements on all new tables in the `public` schema — RLS alone is not sufficient for the Data API. Always include in migration files:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
```

Also use `DROP POLICY IF EXISTS` before `CREATE POLICY` to make migrations idempotent.
