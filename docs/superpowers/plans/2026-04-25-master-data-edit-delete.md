# Master Data Edit & Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add edit and delete (hard delete) to HargaKelas, Karyawan, and Yayasan master data — backend destroy() methods + DELETE routes, and frontend modal/table UI changes.

**Architecture:** Reuse existing add modals with an `initialData` prop for edit mode (PUT on submit). Delete shows inline confirm row state before calling new DELETE endpoints. No new component files.

**Tech Stack:** Laravel 11 (PHP), Next.js 14 (TypeScript), Axios via `api` lib, Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `backend/app/Http/Controllers/Master/HargaController.php` | Add `destroy()` |
| `backend/app/Http/Controllers/Master/KaryawanController.php` | Add `destroy()` |
| `backend/app/Http/Controllers/Master/YayasanController.php` | Add `destroy()` |
| `backend/routes/api.php` | Add 3 DELETE routes |
| `frontend/app/(dashboard)/admin/master-data/TabHarga.tsx` | Edit modal + delete UI |
| `frontend/app/(dashboard)/admin/master-data/TabKaryawan.tsx` | Edit modal + delete UI |
| `frontend/app/(dashboard)/admin/master-data/TabYayasan.tsx` | Edit modal + delete UI |

---

## Task 1: Backend — destroy() methods + DELETE routes

**Files:**
- Modify: `backend/app/Http/Controllers/Master/HargaController.php`
- Modify: `backend/app/Http/Controllers/Master/KaryawanController.php`
- Modify: `backend/app/Http/Controllers/Master/YayasanController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Add destroy() to HargaController**

In `backend/app/Http/Controllers/Master/HargaController.php`, add after the `update()` method (line 50, before closing `}`):

```php
    public function destroy(HargaKelas $harga): JsonResponse
    {
        $harga->delete();
        return response()->json(null, 204);
    }
```

- [ ] **Step 2: Add destroy() to KaryawanController**

In `backend/app/Http/Controllers/Master/KaryawanController.php`, add after the `update()` method (line 42, before closing `}`):

```php
    public function destroy(Karyawan $karyawan): JsonResponse
    {
        $karyawan->absensi()->delete();
        $karyawan->delete();
        return response()->json(null, 204);
    }
```

- [ ] **Step 3: Add destroy() to YayasanController**

In `backend/app/Http/Controllers/Master/YayasanController.php`, add after the `update()` method (line 37, before closing `}`):

```php
    public function destroy(Yayasan $yayasan): JsonResponse
    {
        $yayasan->delete();
        return response()->json(null, 204);
    }
```

- [ ] **Step 4: Add DELETE routes in api.php**

In `backend/routes/api.php`, find the master data middleware block (lines 83–88):

```php
        Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT')->group(function () {
            Route::post('harga',              [\App\Http\Controllers\Master\HargaController::class,   'store']);
            Route::put('harga/{harga}',       [\App\Http\Controllers\Master\HargaController::class,   'update']);
            Route::post('yayasan',            [\App\Http\Controllers\Master\YayasanController::class, 'store']);
            Route::put('yayasan/{yayasan}',   [\App\Http\Controllers\Master\YayasanController::class, 'update']);
        });
```

Replace with:

```php
        Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT')->group(function () {
            Route::post('harga',               [\App\Http\Controllers\Master\HargaController::class,   'store']);
            Route::put('harga/{harga}',        [\App\Http\Controllers\Master\HargaController::class,   'update']);
            Route::delete('harga/{harga}',     [\App\Http\Controllers\Master\HargaController::class,   'destroy']);
            Route::post('yayasan',             [\App\Http\Controllers\Master\YayasanController::class, 'store']);
            Route::put('yayasan/{yayasan}',    [\App\Http\Controllers\Master\YayasanController::class, 'update']);
            Route::delete('yayasan/{yayasan}', [\App\Http\Controllers\Master\YayasanController::class, 'destroy']);
        });
```

Then find the karyawan block (lines 91–95):

```php
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT')->group(function () {
        Route::get('karyawan',              [\App\Http\Controllers\Master\KaryawanController::class, 'index']);
        Route::post('karyawan',             [\App\Http\Controllers\Master\KaryawanController::class, 'store']);
        Route::put('karyawan/{karyawan}',   [\App\Http\Controllers\Master\KaryawanController::class, 'update']);
    });
```

Replace with:

```php
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT')->group(function () {
        Route::get('karyawan',                [\App\Http\Controllers\Master\KaryawanController::class, 'index']);
        Route::post('karyawan',               [\App\Http\Controllers\Master\KaryawanController::class, 'store']);
        Route::put('karyawan/{karyawan}',     [\App\Http\Controllers\Master\KaryawanController::class, 'update']);
        Route::delete('karyawan/{karyawan}',  [\App\Http\Controllers\Master\KaryawanController::class, 'destroy']);
    });
```

- [ ] **Step 5: Verify routes registered**

```bash
cd backend && php artisan route:list --path=master | grep DELETE
```

Expected output (3 rows):
```
DELETE  api/master/harga/{harga}     ...HargaController@destroy
DELETE  api/master/yayasan/{yayasan} ...YayasanController@destroy
```

```bash
php artisan route:list --path=karyawan | grep DELETE
```

Expected:
```
DELETE  api/karyawan/{karyawan}  ...KaryawanController@destroy
```

- [ ] **Step 6: Commit backend**

```bash
git add backend/app/Http/Controllers/Master/HargaController.php \
        backend/app/Http/Controllers/Master/KaryawanController.php \
        backend/app/Http/Controllers/Master/YayasanController.php \
        backend/routes/api.php
git commit -m "feat(master): add destroy() + DELETE routes for harga, karyawan, yayasan"
```

---

## Task 2: Frontend — TabHarga edit + delete

**Files:**
- Modify: `frontend/app/(dashboard)/admin/master-data/TabHarga.tsx`

The `TambahHargaModal` becomes `HargaModal` with an optional `initialData` prop.
Edit mode: kelas + jenis are read-only (they're the unique key); only harga_beli/harga_jual/fee_sales editable.
Submit: POST for add, PUT `/api/master/harga/{id}` for edit.

- [ ] **Step 1: Replace TabHarga.tsx**

Replace the entire file `frontend/app/(dashboard)/admin/master-data/TabHarga.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'

interface KelasHewan { id: number; kode: string; nama: string; urutan: number }
interface Depot      { id: number; nama: string }
interface Harga {
  id: number; jenis: string; musim: number
  harga_beli: number; harga_jual: number; fee_sales: number
  kelas: KelasHewan
}

interface Kelas { id: number; kode: string; nama: string }

function HargaModal({ depotId, musim, initialData, onDone, onClose }: {
  depotId: string; musim: string; initialData?: Harga; onDone: () => void; onClose: () => void
}) {
  const isEdit = !!initialData
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [form, setForm] = useState({
    kelas_id:   initialData ? String(initialData.kelas.id) : '',
    jenis:      initialData?.jenis ?? 'SAPI',
    harga_beli: initialData ? String(initialData.harga_beli) : '',
    harga_jual: initialData ? String(initialData.harga_jual) : '',
    fee_sales:  initialData ? String(initialData.fee_sales) : '0',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!isEdit) {
      api.get('/api/master/kelas').then(r => setKelasList(r.data.data ?? []))
    }
  }, [isEdit])

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.harga_beli || !form.harga_jual) {
      setError('Harga beli dan harga jual wajib diisi'); return
    }
    if (!isEdit && !form.kelas_id) {
      setError('Kelas wajib diisi'); return
    }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await api.put(`/api/master/harga/${initialData!.id}`, {
          harga_beli: Number(form.harga_beli),
          harga_jual: Number(form.harga_jual),
          fee_sales:  Number(form.fee_sales),
        })
      } else {
        await api.post('/api/master/harga', {
          depot_id:   Number(depotId),
          kelas_id:   Number(form.kelas_id),
          jenis:      form.jenis,
          musim:      Number(musim),
          harga_beli: Number(form.harga_beli),
          harga_jual: Number(form.harga_jual),
          fee_sales:  Number(form.fee_sales),
        })
      }
      onDone()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">
            {isEdit ? 'Edit Harga' : 'Tambah Harga'}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-on-surface-variant mb-4 font-body">Depot terpilih · Musim {musim}</p>
        <div className="space-y-3">
          {isEdit ? (
            <div>
              <label className="block text-xs font-body font-medium text-on-surface mb-1">Kelas</label>
              <p className="text-sm text-on-surface font-body">
                {initialData!.kelas.kode} — {initialData!.kelas.nama}
                <span className="ml-2 text-on-surface-variant">({initialData!.jenis})</span>
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-body font-medium text-on-surface mb-1">Kelas *</label>
                <select value={form.kelas_id} onChange={e => set('kelas_id', e.target.value)} className="input-field w-full">
                  <option value="">— Pilih kelas —</option>
                  {kelasList.map(k => <option key={k.id} value={k.id}>{k.kode} — {k.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-body font-medium text-on-surface mb-1">Jenis</label>
                <div className="flex gap-2">
                  {['SAPI', 'DOMBA'].map(j => (
                    <button key={j} onClick={() => set('jenis', j)}
                      className={`px-4 py-1.5 rounded-lg border-2 text-xs font-body transition-colors ${form.jenis === j ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'}`}>
                      {j}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Harga Beli (Rp) *</label>
            <Input type="number" value={form.harga_beli} onChange={e => set('harga_beli', e.target.value)} placeholder="5000000" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Harga Jual (Rp) *</label>
            <Input type="number" value={form.harga_jual} onChange={e => set('harga_jual', e.target.value)} placeholder="6000000" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Fee Sales (Rp)</label>
            <Input type="number" value={form.fee_sales} onChange={e => set('fee_sales', e.target.value)} placeholder="50000" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={submit} loading={saving}>Simpan</Button>
        </div>
      </div>
    </div>
  )
}

export function TabHarga() {
  const [depots, setDepots]   = useState<Depot[]>([])
  const [harga, setHarga]     = useState<Harga[]>([])
  const [depotId, setDepotId] = useState<string>('')
  const [musim, setMusim]     = useState<string>(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal]         = useState(false)
  const [editingItem, setEditingItem]     = useState<Harga | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId]       = useState<number | null>(null)

  useEffect(() => {
    api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
  }, [])

  function loadHarga() {
    if (!depotId) return
    setLoading(true)
    api.get(`/api/master/harga?depot=${depotId}&musim=${musim}`)
      .then(r => setHarga(r.data.data))
      .finally(() => setLoading(false))
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await api.delete(`/api/master/harga/${id}`)
      setHarga(prev => prev.filter(h => h.id !== id))
      setConfirmDeleteId(null)
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Gagal menghapus')
    } finally { setDeletingId(null) }
  }

  function fmt(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Depot</label>
          <select
            value={depotId}
            onChange={e => setDepotId(e.target.value)}
            className="input-field mt-1.5"
          >
            <option value="">Pilih depot...</option>
            {depots.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Musim</label>
          <Input value={musim} onChange={e => setMusim(e.target.value)} className="mt-1.5 w-28" />
        </div>
        <div className="flex gap-2">
          <Button onClick={loadHarga} disabled={!depotId}>Tampilkan</Button>
          {depotId && <Button onClick={() => { setEditingItem(null); setShowModal(true) }}>+ Tambah Harga</Button>}
        </div>
      </div>

      {loading && <p className="text-sm text-on-surface-variant">Memuat...</p>}

      {harga.length > 0 && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Kelas','Jenis','Harga Beli','Harga Jual','Fee Sales','Aksi'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {harga.map((h, i) => (
                <tr key={h.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-4 font-body font-medium">{h.kelas?.kode ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{h.jenis}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface">{fmt(h.harga_beli)}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface">{fmt(h.harga_jual)}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface-variant">{fmt(h.fee_sales)}</td>
                  <td className="py-2.5">
                    {confirmDeleteId === h.id ? (
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-on-surface-variant">Hapus?</span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-on-surface-variant hover:text-on-surface"
                        >Batal</button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          disabled={deletingId === h.id}
                          className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                        >{deletingId === h.id ? '...' : 'Hapus'}</button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingItem(h); setShowModal(true) }}
                          className="text-xs text-primary hover:underline"
                        >Edit</button>
                        <button
                          onClick={() => setConfirmDeleteId(h.id)}
                          className="text-xs text-red-500 hover:underline"
                        >Hapus</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {harga.length === 0 && depotId && !loading && (
        <p className="text-sm text-on-surface-variant text-center py-8">Belum ada harga untuk depot + musim ini.</p>
      )}

      {showModal && (
        <HargaModal
          depotId={depotId}
          musim={musim}
          initialData={editingItem ?? undefined}
          onDone={() => { setShowModal(false); setEditingItem(null); loadHarga() }}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep TabHarga
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/\(dashboard\)/admin/master-data/TabHarga.tsx
git commit -m "feat(master): add edit + delete to TabHarga"
```

---

## Task 3: Frontend — TabKaryawan edit + delete

**Files:**
- Modify: `frontend/app/(dashboard)/admin/master-data/TabKaryawan.tsx`

Edit mode: all fields editable (nama, divisi, tarif_harian, berlaku_dari). Depot hidden in edit (backend update doesn't accept it).
Submit: POST for add, PUT `/api/karyawan/{id}` for edit.

- [ ] **Step 1: Replace TabKaryawan.tsx**

Replace the entire file `frontend/app/(dashboard)/admin/master-data/TabKaryawan.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusChip } from '@/components/ui/StatusChip'
import api from '@/lib/api'

interface Karyawan {
  id: number; nama: string; divisi: string
  tarif_harian: number; berlaku_dari: string; is_active: boolean
}
interface Depot { id: number; nama: string }

function KaryawanModal({ initialData, onDone, onClose }: {
  initialData?: Karyawan; onDone: () => void; onClose: () => void
}) {
  const isEdit = !!initialData
  const [depots, setDepots] = useState<Depot[]>([])
  const [form, setForm] = useState({
    depot_id:     '',
    nama:         initialData?.nama ?? '',
    divisi:       initialData?.divisi ?? '',
    tarif_harian: initialData ? String(initialData.tarif_harian) : '',
    berlaku_dari: initialData?.berlaku_dari ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!isEdit) {
      api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
    }
  }, [isEdit])

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!isEdit && !form.depot_id) { setError('Depot wajib diisi'); return }
    if (!form.nama || !form.divisi || !form.tarif_harian || !form.berlaku_dari) {
      setError('Semua field wajib diisi'); return
    }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await api.put(`/api/karyawan/${initialData!.id}`, {
          nama:         form.nama,
          divisi:       form.divisi,
          tarif_harian: Number(form.tarif_harian),
          berlaku_dari: form.berlaku_dari,
        })
      } else {
        await api.post('/api/karyawan', {
          depot_id:     Number(form.depot_id),
          nama:         form.nama,
          divisi:       form.divisi,
          tarif_harian: Number(form.tarif_harian),
          berlaku_dari: form.berlaku_dari,
        })
      }
      onDone()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">
            {isEdit ? 'Edit Karyawan' : 'Tambah Karyawan'}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          {!isEdit && (
            <div>
              <label className="block text-xs font-body font-medium text-on-surface mb-1">Depot *</label>
              <select value={form.depot_id} onChange={e => set('depot_id', e.target.value)} className="input-field w-full">
                <option value="">— Pilih depot —</option>
                {depots.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Nama *</label>
            <Input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Nama karyawan..." />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Divisi *</label>
            <Input value={form.divisi} onChange={e => set('divisi', e.target.value)} placeholder="Kandang, Admin, dll" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Tarif Harian (Rp) *</label>
            <Input type="number" value={form.tarif_harian} onChange={e => set('tarif_harian', e.target.value)} placeholder="100000" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Berlaku Dari *</label>
            <Input type="date" value={form.berlaku_dari} onChange={e => set('berlaku_dari', e.target.value)} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={submit} loading={saving}>Simpan</Button>
        </div>
      </div>
    </div>
  )
}

export function TabKaryawan() {
  const [karyawan, setKaryawan] = useState<Karyawan[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal]             = useState(false)
  const [editingItem, setEditingItem]         = useState<Karyawan | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId]           = useState<number | null>(null)

  function load() {
    setLoading(true)
    api.get('/api/karyawan')
      .then(r => setKaryawan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await api.delete(`/api/karyawan/${id}`)
      setKaryawan(prev => prev.filter(k => k.id !== id))
      setConfirmDeleteId(null)
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Gagal menghapus')
    } finally { setDeletingId(null) }
  }

  function fmt(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingItem(null); setShowModal(true) }}>+ Tambah Karyawan</Button>
      </div>
      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Nama','Divisi','Tarif Harian','Berlaku Dari','Status','Aksi'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {karyawan.map((k, i) => (
                <tr key={k.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-4 font-body font-medium text-on-surface">{k.nama}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{k.divisi}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface">{fmt(k.tarif_harian)}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{k.berlaku_dari}</td>
                  <td className="py-2.5 pr-4"><StatusChip status={k.is_active ? 'AKTIF' : 'NONAKTIF'} /></td>
                  <td className="py-2.5">
                    {confirmDeleteId === k.id ? (
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-on-surface-variant">Hapus?</span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-on-surface-variant hover:text-on-surface"
                        >Batal</button>
                        <button
                          onClick={() => handleDelete(k.id)}
                          disabled={deletingId === k.id}
                          className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                        >{deletingId === k.id ? '...' : 'Hapus'}</button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingItem(k); setShowModal(true) }}
                          className="text-xs text-primary hover:underline"
                        >Edit</button>
                        <button
                          onClick={() => setConfirmDeleteId(k.id)}
                          className="text-xs text-red-500 hover:underline"
                        >Hapus</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {karyawan.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-on-surface-variant">Belum ada karyawan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
      {showModal && (
        <KaryawanModal
          initialData={editingItem ?? undefined}
          onDone={() => { setShowModal(false); setEditingItem(null); load() }}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep TabKaryawan
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/\(dashboard\)/admin/master-data/TabKaryawan.tsx
git commit -m "feat(master): add edit + delete to TabKaryawan"
```

---

## Task 4: Frontend — TabYayasan edit + delete

**Files:**
- Modify: `frontend/app/(dashboard)/admin/master-data/TabYayasan.tsx`

Edit mode: all fields editable (nama, alamat, kontak_pic, telepon).
Submit: POST for add, PUT `/api/master/yayasan/{id}` for edit.
Note: backend `index()` only returns `is_active = true`. After hard delete the row disappears on next load; filter locally for immediate UI update.

- [ ] **Step 1: Replace TabYayasan.tsx**

Replace the entire file `frontend/app/(dashboard)/admin/master-data/TabYayasan.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusChip } from '@/components/ui/StatusChip'
import api from '@/lib/api'

interface Yayasan {
  id: number; nama: string; alamat: string | null
  kontak_pic: string | null; telepon: string | null; is_active: boolean
}

function YayasanModal({ initialData, onDone, onClose }: {
  initialData?: Yayasan; onDone: () => void; onClose: () => void
}) {
  const isEdit = !!initialData
  const [form, setForm] = useState({
    nama:       initialData?.nama ?? '',
    alamat:     initialData?.alamat ?? '',
    kontak_pic: initialData?.kontak_pic ?? '',
    telepon:    initialData?.telepon ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.nama.trim()) { setError('Nama wajib diisi'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await api.put(`/api/master/yayasan/${initialData!.id}`, form)
      } else {
        await api.post('/api/master/yayasan', form)
      }
      onDone()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">
            {isEdit ? 'Edit Yayasan' : 'Tambah Yayasan'}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Nama Yayasan *</label>
            <Input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Yayasan Al-Hikmah..." />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Alamat</label>
            <Input value={form.alamat} onChange={e => set('alamat', e.target.value)} placeholder="Jl. ..." />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Kontak PIC</label>
            <Input value={form.kontak_pic} onChange={e => set('kontak_pic', e.target.value)} placeholder="Nama penanggung jawab..." />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Telepon</label>
            <Input value={form.telepon} onChange={e => set('telepon', e.target.value)} placeholder="08..." />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={submit} loading={saving}>Simpan</Button>
        </div>
      </div>
    </div>
  )
}

export function TabYayasan() {
  const [yayasan, setYayasan] = useState<Yayasan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal]             = useState(false)
  const [editingItem, setEditingItem]         = useState<Yayasan | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId]           = useState<number | null>(null)

  function load() {
    setLoading(true)
    api.get('/api/master/yayasan')
      .then(r => setYayasan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await api.delete(`/api/master/yayasan/${id}`)
      setYayasan(prev => prev.filter(y => y.id !== id))
      setConfirmDeleteId(null)
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Gagal menghapus')
    } finally { setDeletingId(null) }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingItem(null); setShowModal(true) }}>+ Tambah Yayasan</Button>
      </div>
      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Nama Yayasan','Kontak PIC','Telepon','Status','Aksi'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yayasan.map((y, i) => (
                <tr key={y.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-4">
                    <p className="font-body font-medium text-on-surface">{y.nama}</p>
                    {y.alamat && <p className="text-xs text-on-surface-variant">{y.alamat}</p>}
                  </td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{y.kontak_pic ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{y.telepon ?? '—'}</td>
                  <td className="py-2.5 pr-4"><StatusChip status={y.is_active ? 'AKTIF' : 'NONAKTIF'} /></td>
                  <td className="py-2.5">
                    {confirmDeleteId === y.id ? (
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-on-surface-variant">Hapus?</span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-on-surface-variant hover:text-on-surface"
                        >Batal</button>
                        <button
                          onClick={() => handleDelete(y.id)}
                          disabled={deletingId === y.id}
                          className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                        >{deletingId === y.id ? '...' : 'Hapus'}</button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingItem(y); setShowModal(true) }}
                          className="text-xs text-primary hover:underline"
                        >Edit</button>
                        <button
                          onClick={() => setConfirmDeleteId(y.id)}
                          className="text-xs text-red-500 hover:underline"
                        >Hapus</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {yayasan.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-on-surface-variant">Belum ada yayasan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
      {showModal && (
        <YayasanModal
          initialData={editingItem ?? undefined}
          onDone={() => { setShowModal(false); setEditingItem(null); load() }}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep TabYayasan
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/\(dashboard\)/admin/master-data/TabYayasan.tsx
git commit -m "feat(master): add edit + delete to TabYayasan"
```

---

## Done

All three entities have edit + delete. Backend routes registered. Frontend modals reused with `initialData` prop. Delete uses inline confirm state pattern. No new files created.
