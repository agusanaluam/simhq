# Bulk Pengadaan Hewan — Design Spec

**Date:** 2026-04-25
**Status:** Approved
**Scope:** Add bulk animal intake (multiple animals per submission) to the existing pengadaan module.

---

## Problem

Current `TambahHewanModal` only accepts one animal per submission. Field staff receiving a truck of 10–30 animals must submit the form N times — slow and error-prone.

---

## Solution

Add a `POST /api/hewan/bulk` endpoint and a new `BulkTambahHewanModal` component. The existing single-animal flow is preserved unchanged.

---

## Architecture

### Shared fields (per batch)
`depot_id`, `supplier_id`, `jenis`, `tgl_masuk`, `musim`

### Per-row fields (per animal)
`kelas_asal_id`, `kelas_jual_id`, `bobot_masuk`

### Request shape
```json
{
  "depot_id": 1,
  "supplier_id": 2,
  "jenis": "SAPI",
  "tgl_masuk": "2026-04-25",
  "musim": 2026,
  "rows": [
    { "kelas_asal_id": 1, "kelas_jual_id": 2, "bobot_masuk": 310.5 },
    { "kelas_asal_id": 1, "kelas_jual_id": 1, "bobot_masuk": 285.0 }
  ]
}
```

### Response
```json
{ "hewan": [...], "count": 2 }
```
HTTP 201.

---

## Backend

### New files
- `app/Http/Requests/BulkStoreHewanRequest.php`
- Route entry: `Route::post('/hewan/bulk', [HewanController::class, 'storeBulk'])`  
  Placed **before** `Route::apiResource('hewan', ...)` to avoid conflict.

### New method: `HewanController::storeBulk()`
```php
public function storeBulk(BulkStoreHewanRequest $request): JsonResponse
{
    $data   = $request->validated();
    $shared = Arr::except($data, ['rows']);

    $created = DB::transaction(function () use ($shared, $data) {
        return collect($data['rows'])->map(function ($row) use ($shared) {
            $row             = array_merge($shared, $row);
            $row['no_hewan'] = $this->hewanService->generateNoHewan(
                $shared['depot_id'], $shared['musim'], $shared['jenis']
            );
            return Hewan::create($row);
        });
    });

    return response()->json(['hewan' => $created, 'count' => $created->count()], 201);
}
```

### Transaction strategy
All rows processed in one outer `DB::transaction()`. Each `generateNoHewan()` call runs as a nested savepoint (PostgreSQL). Because `Hewan::create()` is visible within the same transaction, subsequent `generateNoHewan()` calls read the correct latest `no_hewan` — sequential numbering is correct without race conditions.

### Validation: `BulkStoreHewanRequest`
| Field | Rules |
|-------|-------|
| `depot_id` | required, exists:depots,id |
| `supplier_id` | nullable, exists:supplier,id |
| `jenis` | required, in:SAPI,DOMBA |
| `tgl_masuk` | required, date |
| `musim` | required, integer, min:2020, max:2100 |
| `rows` | required, array, min:1, max:50 |
| `rows.*.kelas_asal_id` | required, exists:kelas_hewan,id |
| `rows.*.kelas_jual_id` | required, exists:kelas_hewan,id |
| `rows.*.bobot_masuk` | required, numeric, min:1 |

Max 50 rows per submission — prevents runaway requests.

### No changes to
- `HewanService::generateNoHewan()` — reused as-is
- Existing `store()` method — single-animal flow unchanged
- Migrations / models — no schema changes

---

## Frontend

### New file: `BulkTambahHewanModal.tsx`

**Layout:**
```
┌─────────────────────────────────────────┐
│ Tambah Hewan Massal                      │
│                                          │
│ [Depot ▼]  [Supplier ▼]  [Jenis ▼]      │
│ [Tgl Masuk ____]  [Musim ____]           │
│                                          │
│ ┌──┬────────────┬────────────┬────────┬──┐│
│ │# │ Kelas Asal │ Kelas Jual │ Bobot  │🗑 ││
│ ├──┼────────────┼────────────┼────────┼──┤│
│ │1 │ [select ▼] │ [select ▼] │ [___]  │✕ ││
│ │2 │ [select ▼] │ [select ▼] │ [___]  │✕ ││
│ └──┴────────────┴────────────┴────────┴──┘│
│                                          │
│ [+ Tambah Baris]           (2 ekor)      │
│                                          │
│ [Batal]              [Simpan 2 Ekor]     │
└─────────────────────────────────────────┘
```

**State:**
- `shared`: depot_id, supplier_id, jenis, tgl_masuk, musim
- `rows`: array of `{ kelas_asal_id, kelas_jual_id, bobot_masuk }`
- Default: 1 empty row on open
- `+ Tambah Baris` appends one empty row
- Each row has delete (✕) button; minimum 1 row (last row delete disabled)

**Submit button:** `"Simpan N Ekor"` — N = current row count. Disabled while loading or rows = 0.

**Error handling:** Single error message below the table on API failure. No per-row error display.

**On success:** call `onSuccess()` (parent reloads hewan list), close modal.

### Modified file: `page.tsx`

Button area changes from:
```tsx
<Button onClick={() => setShowModal(true)}>+ Tambah Hewan</Button>
```
To:
```tsx
<Button variant="secondary" onClick={() => setShowBulk(true)}>+ Tambah Massal</Button>
<Button onClick={() => setShowModal(true)}>+ Tambah 1 Ekor</Button>
```

Add `showBulk` state and render `BulkTambahHewanModal` when true. No other changes to page.

---

## Out of Scope

- CSV/Excel file upload
- Per-row error highlighting
- Paste-from-clipboard
- Photo upload during bulk entry (use existing T-15 flow per animal after entry)

---

## Testing

Backend: add `BulkHewanTest` with cases:
1. Valid bulk (3 rows) → 201, correct count, sequential no_hewan
2. rows empty array → 422
3. rows > 50 → 422
4. Invalid kelas_asal_id → 422
5. bobot_masuk = 0 → 422

Frontend: manual smoke test — add 3 rows, submit, verify 3 animals appear in list with correct no_hewan sequence.
