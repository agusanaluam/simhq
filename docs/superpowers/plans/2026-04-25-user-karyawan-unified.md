# User + Karyawan Unified Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Daftarkan sebagai karyawan" checkbox to the add-user form so creating a user account and a karyawan record can happen in one step.

**Architecture:** Backend extends `UserController::store()` to optionally create a Karyawan inside a DB transaction when `buat_karyawan=true` is sent. Frontend adds a checkbox + conditional tarif/tanggal fields to `TambahUserModal`.

**Tech Stack:** Laravel 11 (PHP), Next.js 14 (TypeScript), Tailwind CSS, Axios via `api` lib

---

## File Map

| File | Change |
|------|--------|
| `backend/app/Http/Requests/StoreUserRequest.php` | Add 3 optional karyawan fields |
| `backend/app/Http/Controllers/UserController.php` | Wrap store() in DB::transaction, optionally create Karyawan |
| `frontend/app/(dashboard)/admin/users/page.tsx` | Add checkbox + conditional fields to TambahUserModal |

---

## Task 1: Backend — StoreUserRequest + UserController

**Files:**
- Modify: `backend/app/Http/Requests/StoreUserRequest.php`
- Modify: `backend/app/Http/Controllers/UserController.php`

- [ ] **Step 1: Add karyawan fields to StoreUserRequest**

Replace entire `rules()` method in `backend/app/Http/Requests/StoreUserRequest.php`:

```php
    public function rules(): array
    {
        return [
            'depot_id'      => ['nullable', 'exists:depots,id'],
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'email', 'unique:users,email'],
            'password'      => ['required', 'string', 'min:8'],
            'role'          => ['required', Rule::enum(UserRole::class)],
            'divisi'        => ['nullable', 'string', 'max:100'],
            'phone'         => ['nullable', 'string', 'max:20'],
            'buat_karyawan' => ['sometimes', 'boolean'],
            'tarif_harian'  => ['required_if:buat_karyawan,true', 'integer', 'min:0'],
            'berlaku_dari'  => ['required_if:buat_karyawan,true', 'date'],
        ];
    }
```

- [ ] **Step 2: Update UserController::store()**

Read `backend/app/Http/Controllers/UserController.php` first.

Replace entire `store()` method and add DB import at top:

Add `use Illuminate\Support\Facades\DB;` to the imports (after `use Illuminate\Http\Request;`).

Replace `store()`:

```php
    public function store(StoreUserRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $user = User::create($request->only([
                'depot_id', 'name', 'email', 'password', 'role', 'divisi', 'phone',
            ]));

            if ($request->boolean('buat_karyawan')) {
                \App\Models\Karyawan::create([
                    'user_id'      => $user->id,
                    'depot_id'     => $user->depot_id,
                    'nama'         => $user->name,
                    'divisi'       => $user->divisi ?? '',
                    'tarif_harian' => (int) $request->tarif_harian,
                    'berlaku_dari' => $request->berlaku_dari,
                    'is_active'    => true,
                ]);
            }

            return response()->json(['user' => $user], 201);
        });
    }
```

- [ ] **Step 3: Verify route list still intact**

```bash
cd C:/Users/USER/projects/simhq/backend && php artisan route:list --path=users
```

Expected: POST, GET, PUT, DELETE routes for `api/users` all present.

- [ ] **Step 4: Run tests**

```bash
cd C:/Users/USER/projects/simhq/backend && php artisan test 2>&1 | tail -5
```

Expected: all 241 tests pass.

- [ ] **Step 5: Commit backend**

```bash
cd C:/Users/USER/projects/simhq && git add backend/app/Http/Requests/StoreUserRequest.php backend/app/Http/Controllers/UserController.php
git commit -m "feat(users): optionally create karyawan when storing user"
```

---

## Task 2: Frontend — TambahUserModal checkbox + fields

**Files:**
- Modify: `frontend/app/(dashboard)/admin/users/page.tsx`

- [ ] **Step 1: Add karyawan fields to form state**

In `TambahUserModal`, find the `useState` for `form` (line 27) and add 3 fields:

```tsx
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'ADMIN_ANGGOTA', depot_id: '', divisi: '', phone: '',
    buat_karyawan: false,
    tarif_harian:  '',
    berlaku_dari:  '',
  })
```

Note: `buat_karyawan` is `boolean`, not string. The generic `set()` helper uses string values — add a separate setter for the checkbox:

```tsx
  function setBool(k: string, v: boolean) { setForm(f => ({ ...f, [k]: v })) }
```

- [ ] **Step 2: Add validation for karyawan fields**

In `submit()`, after the existing validation check, add:

```tsx
    if (form.buat_karyawan && (!form.tarif_harian || !form.berlaku_dari)) {
      setError('Tarif harian dan berlaku dari wajib diisi jika daftarkan sebagai karyawan'); return
    }
```

- [ ] **Step 3: Include karyawan fields in POST body**

Replace the `api.post('/api/users', {...})` call:

```tsx
      await api.post('/api/users', {
        name:          form.name,
        email:         form.email,
        password:      form.password,
        role:          form.role,
        depot_id:      form.depot_id ? Number(form.depot_id) : null,
        divisi:        form.divisi || null,
        phone:         form.phone || null,
        buat_karyawan: form.buat_karyawan,
        tarif_harian:  form.buat_karyawan ? Number(form.tarif_harian) : undefined,
        berlaku_dari:  form.buat_karyawan ? form.berlaku_dari : undefined,
      })
```

- [ ] **Step 4: Add checkbox + conditional fields to modal JSX**

After the No HP `<div>` block (after line 101 in original), add before `{error && ...}`:

```tsx
          <div className="pt-1 border-t border-surface-high">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.buat_karyawan}
                onChange={e => setBool('buat_karyawan', e.target.checked)}
                className="rounded"
              />
              <span className="text-xs font-body font-medium text-on-surface">Daftarkan sebagai karyawan</span>
            </label>
            <p className="text-xs text-on-surface-variant mt-0.5 ml-5">Diperlukan agar bisa check-in dan dihitung upah harian</p>
          </div>
          {form.buat_karyawan && (
            <div className="space-y-3 pl-5">
              <div>
                <label className="block text-xs font-body font-medium text-on-surface mb-1">Tarif Harian (Rp) *</label>
                <Input type="number" value={form.tarif_harian} onChange={e => set('tarif_harian', e.target.value)} placeholder="100000" />
              </div>
              <div>
                <label className="block text-xs font-body font-medium text-on-surface mb-1">Berlaku Dari *</label>
                <Input type="date" value={form.berlaku_dari} onChange={e => set('berlaku_dari', e.target.value)} />
              </div>
            </div>
          )}
```

- [ ] **Step 5: TypeScript check**

```bash
cd C:/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | grep -i "users\|error" | head -20
```

Expected: no output (no errors).

- [ ] **Step 6: Commit frontend**

```bash
cd C:/Users/USER/projects/simhq && git add "frontend/app/(dashboard)/admin/users/page.tsx"
git commit -m "feat(users): add 'daftarkan sebagai karyawan' checkbox to tambah user modal"
```

---

## Done

Adding a user now optionally creates a linked karyawan. The user can immediately check in via the app and be included in upah calculations.
