# T-01: Autentikasi & Manajemen Role/User

**Status:** `DONE`
**Phase:** 1 (Fondasi) | **Priority:** Must Have | **Sprint:** 1 Sprint
**Dependencies:** –

---

## Deskripsi

Setup sistem autentikasi berbasis NextAuth v4 + JWT, manajemen user per depot, dan Role-Based Access Control (RBAC) untuk 9 role yang sudah didefinisikan.

## User Stories

- Sebagai Administrator, saya ingin bisa membuat user baru dan assign role sehingga tim punya akses sesuai tanggung jawab.
- Sebagai user, saya ingin login dengan email/password dan sesi timeout 8 jam.

## Acceptance Criteria

- [ ] Login email + password berfungsi, session timeout 8 jam
- [ ] 9 role tersedia: SUPER_ADMIN, OWNER, ADMIN_FINANCE, KEEPER, CUSTOMER_SERVICE, SALES, GENERAL_AFFAIR, TRANDIS, BUYER
- [ ] Setiap route API diproteksi sesuai `ROLE_PERMISSIONS`
- [ ] Halaman dashboard redirect ke login jika belum autentikasi
- [ ] SUPER_ADMIN bisa buat/edit/nonaktifkan user
- [ ] User hanya bisa akses data depot-nya sendiri (kecuali SUPER_ADMIN)

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `User`: id, name, email, password (hashed), role, depotId, divisi, phone, isActive, createdAt
- [ ] Model `Depot`: id, nama, alamat, kota, isActive
- [ ] Relasi User → Depot (belongsTo)

### Backend (API – Express)
- [ ] `POST /auth/login` – validasi kredensial, return JWT
- [ ] `GET /auth/me` – return data user dari token
- [ ] Middleware auth: validasi `x-user-id` + `x-user-role` header (sudah ada pattern di codebase)
- [ ] `GET /users` – list user (SUPER_ADMIN only)
- [ ] `POST /users` – create user (SUPER_ADMIN)
- [ ] `PUT /users/:id` – update user/role (SUPER_ADMIN)
- [ ] `DELETE /users/:id` – soft delete / nonaktifkan (SUPER_ADMIN)

### Frontend (Next.js App Router)
- [ ] Halaman `/login` – form email + password
- [ ] NextAuth config dengan credentials provider
- [ ] `middleware.ts` – redirect unauthenticated ke `/login`
- [ ] Layout komponen: sidebar navigasi berdasarkan role
- [ ] Halaman `/admin/users` – CRUD user (SUPER_ADMIN only)
- [ ] Role guard component untuk hide/show fitur per role

## Notes

- Password hash pakai bcrypt
- JWT session via NextAuth, forward `x-user-id` + `x-user-role` ke API
- Lihat `packages/shared/src/constants.ts` untuk `ROLE_PERMISSIONS`
