# POS Cart Redesign — Design Spec

**Date:** 2026-04-25
**Status:** Approved
**Scope:** Redesign POS from single-item wizard to cart-based split-panel. Support multi-item transactions (mixed jenis/kelas/tipe_qurban). Add `transaksi_items` table. Keep old transaksi columns nullable for backward compat.

---

## Problem

Current POS: 1 transaction = 1 animal of 1 type/class. One customer buying 2 sapi + 3 domba requires 3 separate transactions and 3 invoices. Business requires 1 invoice.

---

## Solution

- Add `transaksi_items` table — each item has its own hewan, jenis, kelas, tipe_qurban, harga.
- Make old `transaksi` per-animal columns nullable (NOT dropped — backward compat with existing tests and data).
- `transaksi.harga` = SUM of items.harga at creation (cached total) — `syncStatusBayar` stays unchanged.
- POS redesigned as split panel: left = animal browser, right = cart + customer + payment.
- Old wizard pages (StepJenisKelas, StepPilihHewan, StepDataPembeli, StepReview) **removed**.

---

## Schema

### New table: `transaksi_items`

```sql
id bigint PK
transaksi_id bigint FK transaksi.id ON DELETE CASCADE
hewan_id bigint nullable FK hewan.id ON DELETE SET NULL
jenis enum(SAPI, DOMBA)
kelas_id bigint FK kelas_hewan.id ON DELETE RESTRICT
tipe_qurban enum(SHQ, THQ, PHQ)
harga unsignedInteger
is_preorder boolean default false
timestamps
```

### Modify `transaksi` — make legacy columns nullable

```sql
ALTER TABLE transaksi ALTER COLUMN tipe_qurban DROP NOT NULL;
ALTER TABLE transaksi ALTER COLUMN jenis DROP NOT NULL;
ALTER TABLE transaksi ALTER COLUMN kelas_id DROP NOT NULL;
ALTER TABLE transaksi ALTER COLUMN harga SET DEFAULT 0;
```

Note: `hewan_id` is already nullable. `kelas_id` constraint (restrictOnDelete) removed since column is now optional.

`transaksi.harga` stays — set to `SUM(items.harga)` when creating via new POS. Old tests that set it directly still work.

---

## Backend

### New model: `TransaksiItem`

```php
// app/Models/TransaksiItem.php
protected $fillable = [
    'transaksi_id', 'hewan_id', 'jenis', 'kelas_id',
    'tipe_qurban', 'harga', 'is_preorder',
];
protected $casts = ['is_preorder' => 'boolean', 'harga' => 'integer'];

public function transaksi(): BelongsTo { return $this->belongsTo(Transaksi::class); }
public function hewan(): BelongsTo    { return $this->belongsTo(Hewan::class); }
public function kelas(): BelongsTo    { return $this->belongsTo(KelasHewan::class, 'kelas_id'); }
```

### Transaksi model — add relation

```php
public function items(): HasMany { return $this->hasMany(TransaksiItem::class); }
```

Keep existing fillable (no changes needed — harga etc still in fillable for old tests).

### StoreTransaksiRequest — add items array

```php
'items'                => ['required', 'array', 'min:1'],
'items.*.hewan_id'     => ['nullable', 'exists:hewan,id'],
'items.*.jenis'        => ['required', 'in:SAPI,DOMBA'],
'items.*.kelas_id'     => ['required', 'exists:kelas_hewan,id'],
'items.*.tipe_qurban'  => ['required', 'in:SHQ,THQ,PHQ'],
'items.*.harga'        => ['required', 'integer', 'min:0'],
'items.*.is_preorder'  => ['required', 'boolean'],
```

Keep existing single-item rules but make them nullable (for backward compat):
```php
'hewan_id'    => ['nullable', 'exists:hewan,id'],
'jenis'       => ['nullable', 'in:SAPI,DOMBA'],
'kelas_id'    => ['nullable', 'exists:kelas_hewan,id'],
'tipe_qurban' => ['nullable', 'in:SHQ,THQ,PHQ'],
```

### TransaksiController::store() — new logic

```php
public function store(StoreTransaksiRequest $request): JsonResponse
{
    $data = $request->validated();
    $items = $data['items'] ?? [];
    $totalHarga = collect($items)->sum('harga');

    $transaksi = DB::transaction(function () use ($data, $items, $totalHarga) {
        $transaksi = Transaksi::create(array_merge(
            Arr::except($data, ['items']),
            ['harga' => $totalHarga]
        ));

        foreach ($items as $item) {
            TransaksiItem::create(array_merge($item, ['transaksi_id' => $transaksi->id]));
            if (!$item['is_preorder'] && $item['hewan_id']) {
                Hewan::where('id', $item['hewan_id'])->update(['status' => 'BOOKED']);
            }
        }

        return $transaksi;
    });

    return response()->json(['transaksi' => $transaksi->load('items.kelas', 'customer')], 201);
}
```

### FakturController — load items

When generating faktur, load `transaksi->items` to show line items instead of single item. Update faktur view/response to include items list.

### TransaksiService::syncStatusBayar()

**No change needed** — it compares `SUM(pembayaran.jumlah)` vs `transaksi.harga`. Since we set `harga = SUM(items.harga)` at creation, the logic is still correct.

---

## Frontend — POS Page Redesign

### New page: `/depot/pos/page.tsx`

Old wizard steps **removed**. New split-panel layout:

```tsx
<div className="flex gap-4" style={{ height: 'calc(100vh - 140px)' }}>
  <div className="flex-1 overflow-y-auto min-w-0">
    <HewanBrowser onAdd={handleAddItem} musim={MUSIM} depotId={depotId} />
  </div>
  <div className="w-96 flex-shrink-0 overflow-y-auto">
    <CartPanel
      items={cart}
      onRemove={removeItem}
      customer={customer}
      onCustomerChange={setCustomer}
      onSubmit={handleSubmit}
      submitting={submitting}
    />
  </div>
</div>
```

### Cart state

```tsx
interface CartItem {
  tempId: string          // client-side UUID for list key
  hewanId: number | null
  noHewan: string | null
  jenis: string
  kelasId: number
  kelasKode: string
  tipeQurban: string
  harga: number
  isPreorder: boolean
}

interface CustomerData {
  customerId: number | null
  nama: string; hp: string; alamat: string
  kelurahan: string; kecamatan: string; kode_pos: string; kota: string
}
```

### New component: `HewanBrowser.tsx`

- Filter bar: Jenis toggle (SAPI/DOMBA), Kelas dropdown, depot filter
- Grid of hewan cards (AVAILABLE only, filtered by kelas)
- Each card shows: no_hewan, kelas_jual, bobot_masuk
- Click card → opens `TipeQurbanModal`
- "Tambah Pre-order" button → opens `PreorderModal`
- Harga lookup: fetches `/api/master/harga?musim={musim}` once on mount

### New component: `TipeQurbanModal.tsx`

Opens when user clicks a hewan card:
```
┌─────────────────────────┐
│ Hewan #001 · A2 · 310kg │
│ Harga: Rp 12.000.000    │
│                         │
│ Tipe Qurban:            │
│ [SHQ] [THQ] [PHQ]       │
│                         │
│ [Batal] [Tambah ke Cart]│
└─────────────────────────┘
```
On confirm: calls `onAdd(cartItem)`.

### New component: `PreorderModal.tsx`

```
┌──────────────────────────┐
│ Tambah Pre-order          │
│ Jenis: [SAPI] [DOMBA]    │
│ Kelas: [dropdown]         │
│ Tipe : [SHQ] [THQ] [PHQ] │
│ Harga: Rp ___            │
│ (auto-filled from harga)  │
│                           │
│ [Batal] [Tambah ke Cart] │
└──────────────────────────┘
```

### New component: `CartPanel.tsx`

Sections:
1. **Cart items** — list with remove button per item, subtotal
2. **Data Pembeli** — autocomplete nama, hp, alamat, kelurahan, kecamatan, kode_pos, kota
3. **Staff** — CS dropdown (CS role), Teller auto-fill, Sales text
4. **Pembayaran** — Metode toggle, Skema toggle, Nominal, Rencana pelunasan (if DP)
5. **Submit button** — disabled if cart empty or nama kosong

### Submit flow (page.tsx `handleSubmit`)

```tsx
// 1. Ensure customer
let customerId = customer.customerId
if (!customerId) {
  const res = await api.post('/api/customer', { ...customer fields... })
  customerId = res.data.customer.id
}

// 2. Create transaksi with items
const res = await api.post('/api/transaksi', {
  depot_id: depotId,
  customer_id: customerId,
  cs_id: staffData.csId,
  teller_id: staffData.tellerId,
  sales_nama: staffData.salesNama || null,
  rencana_pelunasan: payment.rencana_pelunasan || null,
  musim: MUSIM,
  items: cart.map(item => ({
    hewan_id: item.hewanId,
    jenis: item.jenis,
    kelas_id: item.kelasId,
    tipe_qurban: item.tipeQurban,
    harga: item.harga,
    is_preorder: item.isPreorder,
  })),
})
const transaksiId = res.data.transaksi.id

// 3. Create initial payment
await api.post(`/api/transaksi/${transaksiId}/bayar`, {
  jumlah: payment.nominal,
  tipe: payment.tipe,
  metode: payment.metode,
  teller_id: staffData.tellerId,
  tgl_bayar: new Date().toISOString().split('T')[0],
})

router.push('/depot/transaksi')
```

---

## Files

| Action | File |
|--------|------|
| Create | `backend/database/migrations/2026_04_25_020000_create_transaksi_items_table.php` |
| Create | `backend/database/migrations/2026_04_25_020001_make_transaksi_legacy_fields_nullable.php` |
| Create | `backend/app/Models/TransaksiItem.php` |
| Modify | `backend/app/Models/Transaksi.php` |
| Modify | `backend/app/Http/Requests/StoreTransaksiRequest.php` |
| Modify | `backend/app/Http/Controllers/TransaksiController.php` |
| Delete | `frontend/app/(dashboard)/depot/pos/StepJenisKelas.tsx` |
| Delete | `frontend/app/(dashboard)/depot/pos/StepPilihHewan.tsx` |
| Delete | `frontend/app/(dashboard)/depot/pos/StepDataPembeli.tsx` |
| Delete | `frontend/app/(dashboard)/depot/pos/StepReview.tsx` |
| Rewrite | `frontend/app/(dashboard)/depot/pos/page.tsx` |
| Create | `frontend/app/(dashboard)/depot/pos/HewanBrowser.tsx` |
| Create | `frontend/app/(dashboard)/depot/pos/TipeQurbanModal.tsx` |
| Create | `frontend/app/(dashboard)/depot/pos/PreorderModal.tsx` |
| Create | `frontend/app/(dashboard)/depot/pos/CartPanel.tsx` |

---

## Testing

Backend: new `POSCartTest.php`:
1. POST /api/transaksi with 2 items → transaksi created with items, harga = sum, each hewan BOOKED
2. POST /api/transaksi with 1 preorder item → hewan_id null, is_preorder true
3. POST /api/transaksi with 3 items (2 SAPI + 1 DOMBA) → all 3 items created

Old tests that use `Transaksi::create([..., 'harga' => X, 'jenis' => Y, ...])` directly: **no changes needed** — old columns still present (just nullable), not dropped.

**Exception:** `tests/Feature/POS/POSImprovementsTest.php::test_transaksi_store_accepts_sales_nama_and_rencana_pelunasan` POSTs to `/api/transaksi` without `items[]` — will fail new validation. Update this test to include an `items` array with 1 item.

---

## Out of Scope

- Dashboard per_jenis breakdown (still queries transaksi.jenis which is null for new records — addressed in a future ticket)
- FakturController full items display (faktur will show items list but PDF template update is separate)
- Migrate old single-item transaksi to items table
- Assign hewan slot (ploting) from cart directly
