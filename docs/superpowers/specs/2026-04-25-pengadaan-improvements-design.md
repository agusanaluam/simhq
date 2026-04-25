# Pengadaan Improvements — Design Spec

**Date:** 2026-04-25
**Status:** Approved
**Scope:** Three improvements to the pengadaan module: (1) batch audit number per procurement action, (2) kelas_jual nullable with visual indicator for unclassified animals, (3) kelas_asal column + kelas filter in table.

---

## Problem

1. No way to track which procurement batch each animal came from — audit trail missing.
2. Kelas jual must be assigned at intake, but CS team should assign it later after evaluation.
3. Table only shows kelas_jual; kelas_asal (purchase class) not visible. Kelas filter dropdown exists in backend but not wired in frontend.

---

## Solution Overview

- Add `no_pengadaan` integer column to `hewan` — auto-incremented per (depot, musim) per add action.
- Make `kelas_jual_id` nullable — CS assigns via existing edit form.
- Add chip "Belum Dikelas" in table + filter option "Belum Dikelas".
- Add Kelas Beli (kelas_asal) and Pengadaan columns to table.
- Wire kelas filter dropdown in frontend.

---

## Architecture

### One add action = one batch
- `store()` (single animal): generate 1 `no_pengadaan` → assign to the animal.
- `storeBulk()` (N animals): generate 1 `no_pengadaan` → assign to all rows in the batch.
- `no_pengadaan` is sequential per `(depot_id, musim)` — e.g., "ke-1", "ke-2".

### kelas_jual nullable
- CS assigns via existing hewan detail edit form — no new UI needed.
- Null `kelas_jual_id` = "Belum Dikelas".

### Filter: UNCLASSED special value
- Frontend sends `?kelas=UNCLASSED` to filter animals where `kelas_jual_id IS NULL`.
- All other kelas values are integer IDs as before.

---

## Backend

### Migration
File: `backend/database/migrations/XXXX_improve_hewan_pengadaan.php`

Two changes:
```php
// 1. Add no_pengadaan
$table->unsignedSmallInteger('no_pengadaan')->default(0)->after('musim');

// 2. Make kelas_jual_id nullable
$table->foreignId('kelas_jual_id')->nullable()->change();
```

Existing animals get `no_pengadaan = 0` (default) — marks them as pre-feature.

### HewanService — two new methods
```php
public function generateNoPengadaan(int $depotId, int $musim): int
{
    return DB::transaction(fn() => $this->allocateNoPengadaan($depotId, $musim));
}

public function allocateNoPengadaan(int $depotId, int $musim): int
{
    $last = Hewan::where('depot_id', $depotId)
        ->where('musim', $musim)
        ->lockForUpdate()
        ->max('no_pengadaan');
    return ($last ?? 0) + 1;
}
```

- `generateNoPengadaan()` — standalone use (wraps in own transaction).
- `allocateNoPengadaan()` — for use inside an existing transaction (no own wrapper).

### HewanController changes

**`store()`** — both allocations run in one outer `DB::transaction()` (avoids two separate transactions):
```php
[$noHewan, $noPengadaan] = DB::transaction(function () use ($data) {
    return [
        $this->hewanService->allocateNoHewan($data['depot_id'], $data['musim'], $data['jenis']),
        $this->hewanService->allocateNoPengadaan($data['depot_id'], $data['musim']),
    ];
});
$data['no_hewan']     = $noHewan;
$data['no_pengadaan'] = $noPengadaan;
$hewan = Hewan::create($data);
```

**`storeBulk()`** — generate `no_pengadaan` once before the per-row loop, inside the outer transaction:
```php
$created = DB::transaction(function () use ($shared, $data) {
    $noPengadaan = $this->hewanService->allocateNoPengadaan($shared['depot_id'], $shared['musim']);
    return collect($data['rows'])->map(function ($row) use ($shared, $noPengadaan) {
        $row                = array_merge($shared, $row);
        $row['no_hewan']    = $this->hewanService->allocateNoHewan($shared['depot_id'], $shared['musim'], $shared['jenis']);
        $row['no_pengadaan']= $noPengadaan;
        return Hewan::create($row);
    });
});
```

**`index()` filter** — update kelas filter to handle `UNCLASSED`:
```php
->when($request->kelas, fn($q) => $request->kelas === 'UNCLASSED'
    ? $q->whereNull('kelas_jual_id')
    : $q->where('kelas_jual_id', $request->kelas))
```

### Validation changes

**`StoreHewanRequest`:**
```php
'kelas_jual_id' => ['nullable', 'exists:kelas_hewan,id'],
```

**`BulkStoreHewanRequest`:**
```php
'rows.*.kelas_jual_id' => ['nullable', 'exists:kelas_hewan,id'],
```

**`UpdateHewanRequest`:**
```php
'kelas_jual_id' => ['nullable', 'exists:kelas_hewan,id'],
```

### No changes to
- Migrations/models beyond the two changes above.
- `generateNoHewan()` / `allocateNoHewan()` — unchanged.
- Routes.

---

## Frontend

### `page.tsx` — table columns

New column order: No, Pengadaan, Jenis, Kelas Beli, Kelas Jual, Bobot, Tgl Masuk, Supplier, Status, (Detail link)

**Pengadaan column:**
```tsx
<td className="py-2.5 pr-3 text-on-surface-variant">
  {h.no_pengadaan > 0 ? `ke-${h.no_pengadaan}` : '—'}
</td>
```

**Kelas Beli column (kelas_asal):**
```tsx
<td className="py-2.5 pr-3 text-on-surface-variant">{h.kelas_asal?.kode ?? '—'}</td>
```

**Kelas Jual column — null shows chip:**
```tsx
<td className="py-2.5 pr-3">
  {h.kelas_jual
    ? <span className="font-body font-medium">{h.kelas_jual.kode}</span>
    : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-body">Belum Dikelas</span>}
</td>
```

**Hewan interface** — add `no_pengadaan`:
```tsx
interface Hewan {
  id: number; no_hewan: string; jenis: string; status: string
  no_pengadaan: number
  bobot_masuk: string; tgl_masuk: string
  kelas_asal: { kode: string } | null
  kelas_jual: { kode: string } | null
  supplier: { nama: string } | null
}
```

### `page.tsx` — kelas filter

Add state and fetch:
```tsx
const [kelasFilter, setKelas]   = useState('')
const [kelasList, setKelasList] = useState<{id: number; kode: string}[]>([])

useEffect(() => {
  api.get('/api/master/kelas').then(r => setKelasList(r.data.data ?? []))
}, [])
```

Update `loadHewan` to include kelas param:
```tsx
if (kelasFilter) p.set('kelas', kelasFilter)
```

Update `useEffect` deps:
```tsx
useEffect(() => { loadHewan() }, [statusFilter, jenisFilter, kelasFilter])
```

Add dropdown in filter bar:
```tsx
<select value={kelasFilter} onChange={e => setKelas(e.target.value)} className="input-field w-44">
  <option value="">Semua Kelas</option>
  <option value="UNCLASSED">Belum Dikelas</option>
  {kelasList.map(k => <option key={k.id} value={String(k.id)}>{k.kode}</option>)}
</select>
```

### `TambahHewanModal.tsx` — kelas_jual optional

Change kelas_jual select: remove `required`, add "Pilih nanti..." option:
```tsx
<select value={form.kelas_jual_id} onChange={e => set('kelas_jual_id', e.target.value)} className="input-field mt-1.5">
  <option value="">Pilih nanti...</option>
  {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
</select>
```

### `BulkTambahHewanModal.tsx` — kelas_jual optional per row

In the rows table, kelas_jual select: remove `required`, add "Pilih nanti...":
```tsx
<select value={row.kelas_jual_id} onChange={e => updateRow(i, 'kelas_jual_id', e.target.value)} className="input-field">
  <option value="">Pilih nanti...</option>
  {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
</select>
```

In `handleSubmit`, handle empty kelas_jual_id:
```tsx
kelas_jual_id: r.kelas_jual_id ? Number(r.kelas_jual_id) : null,
```

---

## Testing

Backend — new test file `HewanPengadaanTest.php`:
1. `store()` assigns `no_pengadaan = 1` for first animal in depot+musim
2. Two sequential `store()` calls produce `no_pengadaan = 1` then `no_pengadaan = 2`
3. `storeBulk()` with 3 rows — all share same `no_pengadaan`, value increments from prior
4. `store()` with null `kelas_jual_id` → 201 (no longer required)
5. `index()` with `?kelas=UNCLASSED` returns only animals with null kelas_jual_id
6. `update()` can assign `kelas_jual_id` to a hewan that had null

---

## Out of Scope

- StatistikPanel changes.
- Dedicated "Pengkelasan" UI (CS uses existing edit form).
- Filtering by `no_pengadaan`.
- Bulk "assign kelas to all animals in batch" action.
