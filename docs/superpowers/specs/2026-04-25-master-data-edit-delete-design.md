# Master Data Edit & Delete — Design Spec

**Date:** 2026-04-25  
**Scope:** HargaKelas, Karyawan, Yayasan  
**Skip:** Unit tests

---

## Problem

Tiga entitas master data (HargaKelas, Karyawan, Yayasan) hanya punya UI tambah (modal) dan baca (tabel). Belum ada edit atau delete di frontend. Backend update sudah ada (PUT route + controller), delete belum ada sama sekali.

---

## Approach

Reuse modal add yang ada untuk edit (pre-fill data). Delete via inline confirm di baris tabel. Hard delete untuk semua tiga entitas.

---

## Backend Changes

### Routes baru (DELETE)

```php
// routes/api.php — dalam prefix('master') + middleware('role:SUPER_ADMIN,KEPALA_DEPOT')
Route::delete('harga/{harga}',    [HargaController::class,    'destroy']);
Route::delete('karyawan/{karyawan}', [KaryawanController::class, 'destroy']);
Route::delete('yayasan/{yayasan}',   [YayasanController::class,  'destroy']);
```

### Controller methods

**HargaController::destroy**
```php
public function destroy(HargaKelas $harga): JsonResponse
{
    $harga->delete();
    return response()->json(null, 204);
}
```

**KaryawanController::destroy**
```php
public function destroy(Karyawan $karyawan): JsonResponse
{
    // Hapus absensi dulu (HasMany, FK constraint)
    $karyawan->absensi()->delete();
    $karyawan->delete();
    return response()->json(null, 204);
}
```

**YayasanController::destroy**
```php
public function destroy(Yayasan $yayasan): JsonResponse
{
    $yayasan->delete();
    return response()->json(null, 204);
}
```

> Catatan: Sebelum implement, cek apakah HargaKelas atau Yayasan direferensi FK di tabel transaksi lain. Jika ada, hapus dependent records terlebih dahulu atau return 422 dengan pesan jelas.

---

## Frontend Changes

### Modal Edit (pattern sama untuk ketiga tab)

Tambah state di tab component:
```tsx
const [editingItem, setEditingItem] = useState<EntityType | null>(null);
```

Modal menerima `editingItem`:
- `null` → mode tambah (behavior sekarang)
- `non-null` → mode edit: pre-fill form, title "Edit ...", submit PUT ke `/{id}`

Form state di-init ulang tiap kali `editingItem` berubah via `useEffect`:
```tsx
useEffect(() => {
  if (editingItem) {
    setForm({ ...fieldsMappedFromEditingItem });
  } else {
    setForm(defaultForm);
  }
}, [editingItem]);
```

Submit handler:
```tsx
const isEdit = editingItem !== null;
const url = isEdit ? `/api/master/{entity}/${editingItem.id}` : `/api/master/{entity}`;
const method = isEdit ? 'PUT' : 'POST';
```

### Tabel — Kolom Aksi

Tambah kolom paling kanan "Aksi" di tiap tabel.

**Normal state per baris:**
```
[✏️ Edit]  [🗑️ Hapus]
```

**Setelah klik Hapus (confirm state):**
```
Hapus data ini?  [Batal]  [Hapus]
```

States yang ditambah:
```tsx
const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
const [deletingId, setDeletingId] = useState<number | null>(null);
```

Delete flow:
1. Klik 🗑️ → `setConfirmDeleteId(row.id)`
2. Klik Hapus confirm → `setDeletingId(id)` → `DELETE /api/master/{entity}/{id}`
3. Success → refresh list → reset both states
4. Klik Batal → `setConfirmDeleteId(null)`

---

## File yang Diubah

### Backend
- `app/Http/Controllers/Master/HargaController.php` — tambah `destroy()`
- `app/Http/Controllers/Master/KaryawanController.php` — tambah `destroy()`
- `app/Http/Controllers/Master/YayasanController.php` — tambah `destroy()`
- `routes/api.php` — tambah 3 DELETE routes

### Frontend
- `frontend/app/(dashboard)/admin/master-data/TabHarga.tsx` — edit modal + delete UI
- `frontend/app/(dashboard)/admin/master-data/TabKaryawan.tsx` — edit modal + delete UI
- `frontend/app/(dashboard)/admin/master-data/TabYayasan.tsx` — edit modal + delete UI

---

## Constraints

- Auth: semua aksi (edit + delete) hanya `SUPER_ADMIN` dan `KEPALA_DEPOT`
- Hard delete — tidak ada soft delete / `is_active` toggle
- No unit tests
- Tidak buat komponen baru — extend tab yang ada
