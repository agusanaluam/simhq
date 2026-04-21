# Project Init Design — SIM Hewan Qurban
**Date:** 2026-04-21  
**Status:** Approved  
**Scope:** Monorepo scaffold + T-01 (Auth & RBAC)

---

## 1. Overview

Full monorepo scaffold for SIM Hewan Qurban — web-based qurban animal sales management system. Single git repo containing Laravel 11 backend + Next.js 14 frontend. Start with T-01 (Auth & Role Management) as foundation for all subsequent tasks.

**Tech Stack:**
| Layer | Technology |
|-------|-----------|
| Backend API | Laravel 11 + Laravel Sanctum |
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Database | PostgreSQL 16 |
| Auth | Laravel Sanctum (token-based SPA) + NextAuth v5 credentials |
| File Storage | Cloudflare R2 (S3-compatible) |
| Queue | Laravel Queue + Redis |
| Notifications | WAHA API (self-hosted WhatsApp) |
| PDF | Puppeteer (via Node service) or DomPDF |
| Monitoring | Laravel Telescope + Sentry |

---

## 2. Repository Structure

```
simhq/
├── backend/                        ← Laravel 11
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Auth/
│   │   │   │   │   └── AuthController.php
│   │   │   │   ├── UserController.php
│   │   │   │   └── DepotController.php
│   │   │   ├── Middleware/
│   │   │   │   └── CheckRole.php
│   │   │   └── Requests/
│   │   ├── Models/
│   │   │   ├── User.php
│   │   │   └── Depot.php
│   │   ├── Policies/
│   │   │   ├── UserPolicy.php
│   │   │   └── DepotPolicy.php
│   │   └── Enums/
│   │       └── UserRole.php
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── create_depots_table.php
│   │   │   └── create_users_table.php
│   │   └── seeders/
│   │       └── DatabaseSeeder.php   ← seed SUPER_ADMIN + depot dummy
│   ├── routes/
│   │   ├── api.php
│   │   └── web.php
│   ├── config/
│   │   └── filesystems.php          ← R2 disk config
│   └── .env.example
│
├── frontend/                        ← Next.js 14
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx           ← sidebar + nav (role-aware)
│   │   │   └── dashboard/
│   │   │       └── page.tsx
│   │   └── katalog/                 ← public SSR (no auth required)
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/                      ← design system primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── StatusChip.tsx
│   │   └── shared/
│   │       └── Sidebar.tsx
│   ├── lib/
│   │   ├── api.ts                   ← axios instance + interceptors
│   │   └── auth.ts                  ← NextAuth config
│   ├── styles/
│   │   └── globals.css              ← Tailwind + CSS custom properties
│   ├── stitch-reference/            ← Stitch HTML screens (read-only reference)
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── .env.local.example
│
├── .gitignore
├── .env.example                     ← shared env template
└── README.md
```

---

## 3. Database Schema — T-01

### depots
```sql
id          BIGSERIAL PRIMARY KEY
nama        VARCHAR(255) NOT NULL
alamat      TEXT
kota        VARCHAR(100)
is_active   BOOLEAN DEFAULT true
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

### users
```sql
id          BIGSERIAL PRIMARY KEY
depot_id    BIGINT FK → depots (nullable — SUPER_ADMIN has no depot)
name        VARCHAR(255) NOT NULL
email       VARCHAR(255) UNIQUE NOT NULL
password    VARCHAR(255) NOT NULL    -- bcrypt hashed
role        VARCHAR(50) NOT NULL     -- enum UserRole
divisi      VARCHAR(100)
phone       VARCHAR(20)
is_active   BOOLEAN DEFAULT true
created_at  TIMESTAMP
updated_at  TIMESTAMP
deleted_at  TIMESTAMP                -- soft delete
```

### UserRole Enum (16 roles)
```php
SUPER_ADMIN
KEPALA_DEPOT
ADMIN_KETUA
ADMIN_ANGGOTA
KANDANG_SAPI_KETUA
KANDANG_SAPI_ANGGOTA
KANDANG_DOMBA_KETUA
KANDANG_DOMBA_ANGGOTA
CS_KETUA
CS_ANGGOTA
LOGISTIK_KETUA
LOGISTIK_ANGGOTA
PAKAN_KETUA
PAKAN_ANGGOTA
KONSTRUKSI_KETUA
KONSTRUKSI_ANGGOTA
```

---

## 4. API Routes — T-01

```
POST   /api/auth/login          public — email + password → Sanctum token
POST   /api/auth/logout         auth:sanctum
GET    /api/auth/me             auth:sanctum

GET    /api/users               auth:sanctum + role:SUPER_ADMIN
POST   /api/users               auth:sanctum + role:SUPER_ADMIN
PUT    /api/users/{id}          auth:sanctum + role:SUPER_ADMIN
DELETE /api/users/{id}          auth:sanctum + role:SUPER_ADMIN  (soft delete)

GET    /api/depots              auth:sanctum + role:SUPER_ADMIN
POST   /api/depots              auth:sanctum + role:SUPER_ADMIN
PUT    /api/depots/{id}         auth:sanctum + role:SUPER_ADMIN
```

---

## 5. RBAC Design

- Middleware `CheckRole` validates role from authenticated user
- All models use Laravel Policy (no manual if/else in controllers)
- Depot isolation: every query scoped to `auth()->user()->depot_id` unless `SUPER_ADMIN`
- `SUPER_ADMIN` has `depot_id = null` — bypasses depot isolation

```php
// Route group pattern
Route::middleware(['auth:sanctum', 'role:SUPER_ADMIN'])->group(function () {
    Route::apiResource('users', UserController::class);
    Route::apiResource('depots', DepotController::class);
});
```

---

## 6. Frontend Auth Flow

```
1. User → POST /api/auth/login (via NextAuth credentials provider)
2. Laravel → returns { token, user: { id, name, role, depot_id } }
3. NextAuth → stores token + user in encrypted session cookie
4. Every API request → Authorization: Bearer {token}
5. middleware.ts → redirect unauthenticated to /login
6. Sidebar → renders nav items based on session.user.role
```

---

## 7. Design System — Tailwind Tokens

**Palette** (approved): Blue `#2779a7` + White `#ffffff` + Gold `#ECD06F`

```js
// tailwind.config.ts — key tokens
colors: {
  primary:          '#2779a7',
  'primary-c':      '#1e6090',   // gradient end
  brand:            '#3491be',   // hover/active/links
  'primary-f':      '#a8d8f0',   // light on dark bg
  accent:           '#ECD06F',   // gold — KPI highlight, badge
  'accent-dim':     '#d4b84e',   // gold hover
  surface: {
    lowest:         '#ffffff',
    low:            '#f0f7fc',   // page background
    DEFAULT:        '#e3f0f8',   // sidebar
    high:           '#d6e8f4',   // nested sections
    highest:        '#c9e0f0',   // input fills
  },
  'on-surface':     '#0a1f2e',
  'on-surface-variant': '#2d4a5e',
  'on-primary':     '#ffffff',
  'on-accent':      '#1a1200',
  error:            '#ba1a1a',
  tertiary:         '#a72d51',
  'secondary-c':    '#dbeef8',
}
```

**Button rules:**
- Primary: `linear-gradient(135deg, #2779a7, #1e6090)`, radius `xl` (12px)
- Accent CTA: `linear-gradient(135deg, #ECD06F, #d4b84e)`, text `#1a1200`
- No border on cards — use surface tonal shifts only
- No 1px dividers — use 16px vertical spacing or tonal zebra striping

**Status chips** (full/9999px radius):
- TERSEDIA: `#dcfce7` / `#15803d`
- DIPESAN:  `#fef9c3` / `#854d0e`
- TERJUAL:  `#dbeef8` / `#2779a7`
- MATI:     `#fee2e2` / `#991b1b`

---

## 8. Cloudflare R2 Config

```env
FILESYSTEM_DISK=r2
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_DEFAULT_REGION=auto
R2_BUCKET=simhq-assets
R2_URL=https://<account_id>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://assets.simhq.id   # ganti dengan custom domain R2 milik kamu
```

```php
// config/filesystems.php
'r2' => [
    'driver'                  => 's3',
    'key'                     => env('R2_ACCESS_KEY_ID'),
    'secret'                  => env('R2_SECRET_ACCESS_KEY'),
    'region'                  => env('R2_DEFAULT_REGION', 'auto'),
    'bucket'                  => env('R2_BUCKET'),
    'url'                     => env('R2_PUBLIC_URL'),
    'endpoint'                => env('R2_URL'),
    'use_path_style_endpoint' => true,
],
```

Package: `league/flysystem-aws-s3-v3`

---

## 9. Git Strategy

- Single repo at `simhq/` root
- Branch: `main` (stable) + `dev` (active development)
- Each task = 1 feature branch: `feat/T-01-auth`, `feat/T-02-master-data`, etc.
- Commit per logical unit (not per file)

---

## 10. Stitch Design Reference

Stitch project `6711390392877823593` — 7 screens available:
- Login Page (3 versions) → reference for `app/(auth)/login/page.tsx`
- Dashboard SIM / Dashboard Depot (2 versions) → reference for `app/(dashboard)/dashboard/`
- POS Step 1 → reference for future T-05

HTML files saved to `frontend/stitch-reference/` as static reference.

---

## Decisions

| # | Decision |
|---|---------|
| D-01 | Monorepo: `backend/` + `frontend/` in single `simhq/` repo |
| D-02 | Manual local dev (no Docker) |
| D-03 | Cloudflare R2 replaces MinIO |
| D-04 | Tech stack follows PRD: Laravel 11 + Next.js 14 + PostgreSQL 16 |
| D-05 | Task files (Express/Prisma/NextAuth) overridden by PRD stack |
| D-06 | Color palette: `#2779a7` + `#ffffff` + `#ECD06F` |
| D-07 | Start scaffold with T-01 (Auth & Role Management) |
