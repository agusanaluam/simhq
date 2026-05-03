# POS Biaya Tambahan + Tipe Qurban Label Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah `ongkos_kirim` + `biaya_potong` ke transaksi POS, update label tipe qurban THQ/PHQ, fix format date dan currency di frontend.

**Architecture:** Backend — 1 migration baru + update model/request/controller. Frontend — buat `lib/format.ts` shared utility, update CartPanel dengan dua input biaya, update label di TipeQurbanModal + PreorderModal, fix date display di detail transaksi.

**Tech Stack:** Laravel 11, PostgreSQL, Next.js 14, TypeScript, Tailwind

---

## File Map

### Backend — Modified
```
backend/app/Models/Transaksi.php                             ← add ongkos_kirim, biaya_potong to fillable + casts
backend/app/Http/Requests/StoreTransaksiRequest.php          ← add validation for ongkos_kirim, biaya_potong
backend/app/Http/Controllers/TransaksiController.php         ← update total = harga + ongkos_kirim + biaya_potong
backend/tests/Feature/POS/POSImprovementsTest.php            ← add test_biaya_tambahan_masuk_ke_total
```

### Backend — Created
```
backend/database/migrations/XXXX_add_biaya_tambahan_to_transaksi_table.php
```

### Frontend — Created
```
frontend/lib/format.ts                                        ← formatDate, formatIDR, parseCurrency
```

### Frontend — Modified
```
frontend/app/(dashboard)/depot/pos/TipeQurbanModal.tsx        ← update THQ/PHQ labels
frontend/app/(dashboard)/depot/pos/PreorderModal.tsx          ← add descriptive labels, update THQ/PHQ
frontend/app/(dashboard)/depot/pos/CartPanel.tsx              ← add biaya tambahan inputs, currency format
frontend/app/(dashboard)/depot/pos/page.tsx                   ← update CartSubmitData + API payload
frontend/app/(dashboard)/depot/transaksi/[id]/page.tsx        ← fix tgl_bayar date display
```

---

## Task 1: Migration — Tambah ongkos_kirim + biaya_potong

### Files
- Create: `backend/database/migrations/XXXX_add_biaya_tambahan_to_transaksi_table.php`

- [ ] **Step 1: Generate migration**

```bash
cd C:/Users/USER/projects/simhq/backend
php artisan make:migration add_biaya_tambahan_to_transaksi_table --table=transaksi
```

Expected: file baru di `database/migrations/`.

- [ ] **Step 2: Fill migration**

Buka file yang baru dibuat, ganti isi `up()` dan `down()`:

```php
public function up(): void
{
    Schema::table('transaksi', function (Blueprint $table) {
        $table->unsignedInteger('ongkos_kirim')->default(0)->after('total');
        $table->unsignedInteger('biaya_potong')->default(0)->after('ongkos_kirim');
    });
}

public function down(): void
{
    Schema::table('transaksi', function (Blueprint $table) {
        $table->dropColumn(['ongkos_kirim', 'biaya_potong']);
    });
}
```

- [ ] **Step 3: Run migration**

```bash
php artisan migrate
```

Expected: `Migrating: XXXX_add_biaya_tambahan_to_transaksi_table` — no errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/USER/projects/simhq
git add backend/database/migrations/
git commit -m "feat(db): add ongkos_kirim + biaya_potong to transaksi table"
```

---

## Task 2: Backend Model + Request + Controller + Test (TDD)

### Files
- Modify: `backend/app/Models/Transaksi.php`
- Modify: `backend/app/Http/Requests/StoreTransaksiRequest.php`
- Modify: `backend/app/Http/Controllers/TransaksiController.php`
- Modify: `backend/tests/Feature/POS/POSImprovementsTest.php`

- [ ] **Step 1: Tulis failing test**

Buka `backend/tests/Feature/POS/POSImprovementsTest.php`. Tambah method berikut di akhir class (sebelum `}`):

```php
public function test_biaya_tambahan_masuk_ke_total(): void
{
    $customer = Customer::create(['nama' => 'Test', 'hp' => '081234567890']);

    $res = $this->actingAs($this->superAdmin)
        ->postJson('/api/transaksi', [
            'depot_id'     => $this->depot->id,
            'customer_id'  => $customer->id,
            'musim'        => 2026,
            'ongkos_kirim' => 50_000,
            'biaya_potong' => 100_000,
            'items'        => [
                [
                    'jenis'       => 'SAPI',
                    'kelas_id'    => $this->kelas->id,
                    'tipe_qurban' => 'PHQ',
                    'harga'       => 6_000_000,
                    'is_preorder' => true,
                    'hewan_id'    => null,
                ],
            ],
        ])
        ->assertCreated();

    $this->assertDatabaseHas('transaksi', [
        'ongkos_kirim' => 50_000,
        'biaya_potong' => 100_000,
        'total'        => 6_150_000,
    ]);
}
```

Juga tambah `use App\Models\Customer;` di bagian imports jika belum ada.

- [ ] **Step 2: Jalankan test — pastikan FAIL**

```bash
cd C:/Users/USER/projects/simhq/backend
php artisan test tests/Feature/POS/POSImprovementsTest.php::test_biaya_tambahan_masuk_ke_total
```

Expected: FAIL — kolom `ongkos_kirim` tidak diterima atau `total` tidak sesuai.

- [ ] **Step 3: Update Transaksi model**

Buka `backend/app/Models/Transaksi.php`. Ganti `$fillable` dan `$casts`:

```php
protected $fillable = [
    'depot_id', 'no_faktur', 'hewan_id', 'customer_id',
    'cs_id', 'teller_id', 'sales_id', 'sales_nama', 'rencana_pelunasan', 'yayasan_id',
    'tipe_qurban', 'jenis', 'kelas_id',
    'harga', 'total', 'ongkos_kirim', 'biaya_potong',
    'status_bayar', 'status_transaksi', 'musim', 'catatan',
];

protected $casts = [
    'status_transaksi'  => StatusTransaksi::class,
    'status_bayar'      => StatusBayar::class,
    'harga'             => 'integer',
    'total'             => 'integer',
    'ongkos_kirim'      => 'integer',
    'biaya_potong'      => 'integer',
    'musim'             => 'integer',
    'rencana_pelunasan' => 'date',
];
```

- [ ] **Step 4: Update StoreTransaksiRequest**

Buka `backend/app/Http/Requests/StoreTransaksiRequest.php`. Tambah dua rule di dalam `rules()`:

```php
'ongkos_kirim' => ['nullable', 'integer', 'min:0'],
'biaya_potong' => ['nullable', 'integer', 'min:0'],
```

Letakkan setelah baris `'rencana_pelunasan'`.

- [ ] **Step 5: Update TransaksiController::store**

Buka `backend/app/Http/Controllers/TransaksiController.php`. Ganti method `store()`:

```php
public function store(StoreTransaksiRequest $request): JsonResponse
{
    $data          = $request->validated();
    $items         = $data['items'] ?? [];
    $totalHarga    = collect($items)->sum('harga');
    $biayaTambahan = ($data['ongkos_kirim'] ?? 0) + ($data['biaya_potong'] ?? 0);

    $hasPreorder = collect($items)->contains('is_preorder', true);
    $status      = $hasPreorder
        ? StatusTransaksi::MENUNGGU_HEWAN->value
        : StatusTransaksi::HEWAN_TERALOKASI->value;

    $transaksi = DB::transaction(function () use ($data, $items, $totalHarga, $biayaTambahan, $status) {
        $noFaktur = $this->svc->generateNoFaktur($data['depot_id'], $data['musim']);

        $transaksi = Transaksi::create(array_merge(
            Arr::except($data, ['items']),
            [
                'no_faktur'        => $noFaktur,
                'harga'            => $totalHarga,
                'total'            => $totalHarga + $biayaTambahan,
                'status_transaksi' => $status,
            ]
        ));

        foreach ($items as $item) {
            TransaksiItem::create(array_merge($item, ['transaksi_id' => $transaksi->id]));
            if (!$item['is_preorder'] && !empty($item['hewan_id'])) {
                Hewan::where('id', $item['hewan_id'])->update(['status' => StatusHewan::BOOKED->value]);
            }
        }

        return $transaksi;
    });

    return response()->json([
        'transaksi' => $transaksi->load(['items.kelas', 'customer']),
    ], 201);
}
```

- [ ] **Step 6: Jalankan test — pastikan PASS**

```bash
php artisan test tests/Feature/POS/POSImprovementsTest.php::test_biaya_tambahan_masuk_ke_total
```

Expected: PASS.

- [ ] **Step 7: Jalankan full test suite — pastikan tidak ada regresi**

```bash
php artisan test
```

Expected: semua test pass.

- [ ] **Step 8: Commit**

```bash
cd C:/Users/USER/projects/simhq
git add backend/app/Models/Transaksi.php \
        backend/app/Http/Requests/StoreTransaksiRequest.php \
        backend/app/Http/Controllers/TransaksiController.php \
        backend/tests/Feature/POS/POSImprovementsTest.php
git commit -m "feat(pos): ongkos_kirim + biaya_potong — store + test"
```

---

## Task 3: Frontend — format.ts Utility

### Files
- Create: `frontend/lib/format.ts`

- [ ] **Step 1: Buat file**

```typescript
// frontend/lib/format.ts

export function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  const part = d.split('T')[0]
  const [y, m, day] = part.split('-').map(Number)
  if (!y || !m || !day) return '—'
  return new Date(y, m - 1, day).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatIDR(n: number): string {
  return n.toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
}

export function parseCurrency(s: string): number {
  return parseInt(s.replace(/\D/g, ''), 10) || 0
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:/Users/USER/projects/simhq/frontend
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/USER/projects/simhq
git add frontend/lib/format.ts
git commit -m "feat(util): add formatDate, formatIDR, parseCurrency helpers"
```

---

## Task 4: Frontend — Update Label Tipe Qurban

### Files
- Modify: `frontend/app/(dashboard)/depot/pos/TipeQurbanModal.tsx`
- Modify: `frontend/app/(dashboard)/depot/pos/PreorderModal.tsx`

- [ ] **Step 1: Update TipeQurbanModal.tsx**

Buka `frontend/app/(dashboard)/depot/pos/TipeQurbanModal.tsx`.

Ganti konstanta `TIPE_OPTIONS`:

```typescript
const TIPE_OPTIONS = [
  { value: 'SHQ', label: 'SHQ – Kirim Hidup' },
  { value: 'THQ', label: 'THQ – Titip ke Yayasan' },
  { value: 'PHQ', label: 'PHQ – Potong di Depot, Kirim Daging' },
]
```

- [ ] **Step 2: Update PreorderModal.tsx**

Buka `frontend/app/(dashboard)/depot/pos/PreorderModal.tsx`.

Ganti baris `const TIPE_OPTIONS = ['SHQ', 'THQ', 'PHQ']` dengan:

```typescript
const TIPE_OPTIONS = [
  { value: 'SHQ', label: 'SHQ – Kirim Hidup' },
  { value: 'THQ', label: 'THQ – Titip ke Yayasan' },
  { value: 'PHQ', label: 'PHQ – Potong di Depot, Kirim Daging' },
]
```

Lalu update bagian render pilihan tipe di PreorderModal — ganti section tipe qurban:

```tsx
<div>
  <label className="block text-sm font-body font-medium text-on-surface mb-1">Tipe Qurban</label>
  <div className="flex flex-col gap-2">
    {TIPE_OPTIONS.map(t => (
      <button
        key={t.value}
        type="button"
        onClick={() => setTipe(t.value)}
        className={`px-3 py-2 rounded-lg border-2 text-sm font-body text-left transition-colors ${
          tipe === t.value ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
        }`}
      >
        {t.label}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 3: TypeScript check**

```bash
cd C:/Users/USER/projects/simhq/frontend
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/USER/projects/simhq
git add frontend/app/\(dashboard\)/depot/pos/TipeQurbanModal.tsx \
        frontend/app/\(dashboard\)/depot/pos/PreorderModal.tsx
git commit -m "feat(pos): update tipe qurban labels THQ/PHQ"
```

---

## Task 5: Frontend — CartPanel + POS page

### Files
- Modify: `frontend/app/(dashboard)/depot/pos/CartPanel.tsx`
- Modify: `frontend/app/(dashboard)/depot/pos/page.tsx`

- [ ] **Step 1: Update CartSubmitData interface di page.tsx**

Buka `frontend/app/(dashboard)/depot/pos/page.tsx`.

Ganti interface `CartSubmitData`:

```typescript
export interface CartSubmitData {
  customerId: number
  nama: string; hp: string; alamat: string
  kelurahan: string; kecamatan: string; kode_pos: string; kota: string
  csId: number | null
  tellerId: number | null
  salesNama: string
  metodeBayar: string
  tipeBayar: string
  nominalBayar: number
  rencana_pelunasan: string
  ongkosKirim: number
  biayaPotong: number
}
```

- [ ] **Step 2: Update handleSubmit di page.tsx**

Ganti bagian `api.post('/api/transaksi', {...})` di dalam `handleSubmit`:

```typescript
const res = await api.post('/api/transaksi', {
  depot_id:           depotId,
  customer_id:        data.customerId,
  cs_id:              data.csId,
  teller_id:          data.tellerId,
  sales_id:           null,
  sales_nama:         data.salesNama || null,
  rencana_pelunasan:  data.rencana_pelunasan || null,
  ongkos_kirim:       data.ongkosKirim || 0,
  biaya_potong:       data.biayaPotong || 0,
  musim:              MUSIM,
  items: cart.map(item => ({
    hewan_id:    item.hewanId,
    jenis:       item.jenis,
    kelas_id:    item.kelasId,
    tipe_qurban: item.tipeQurban,
    harga:       item.harga,
    is_preorder: item.isPreorder,
  })),
})
```

- [ ] **Step 3: Update CartPanel.tsx — tambah state + imports**

Buka `frontend/app/(dashboard)/depot/pos/CartPanel.tsx`.

Tambah import di baris pertama file (setelah `'use client'`):

```typescript
import { formatIDR, parseCurrency } from '@/lib/format'
```

Di dalam function `CartPanel`, tambah dua state baru setelah state `rencana`:

```typescript
const [ongkosKirim, setOngkosKirim] = useState(0)
const [biayaPotong, setBiayaPotong] = useState(0)
```

- [ ] **Step 4: Update kalkulasi total di CartPanel.tsx**

Ganti baris:

```typescript
const total = items.reduce((sum, i) => sum + i.harga, 0)
```

Menjadi:

```typescript
const subtotal = items.reduce((sum, i) => sum + i.harga, 0)
const total    = subtotal + ongkosKirim + biayaPotong
```

- [ ] **Step 5: Tambah section Biaya Tambahan di CartPanel.tsx**

Tambah section baru setelah section `/* Payment */` dan sebelum `/* Submit */`.

Cari baris `{/* Submit */}` dan tambahkan section di atasnya:

```tsx
{/* Biaya Tambahan */}
<div className="p-4 border-b border-surface-high space-y-3">
  <h3 className="font-display font-semibold text-on-surface text-sm">Biaya Tambahan</h3>

  <div>
    <label className="block text-sm font-body font-medium text-on-surface mb-1">Ongkos Kirim</label>
    <input
      type="text"
      value={ongkosKirim ? ongkosKirim.toLocaleString('id-ID') : ''}
      onChange={e => setOngkosKirim(parseCurrency(e.target.value))}
      className="input-field w-full"
      placeholder="0"
    />
  </div>

  <div>
    <label className="block text-sm font-body font-medium text-on-surface mb-1">Biaya Potong</label>
    <input
      type="text"
      value={biayaPotong ? biayaPotong.toLocaleString('id-ID') : ''}
      onChange={e => setBiayaPotong(parseCurrency(e.target.value))}
      className="input-field w-full"
      placeholder="0"
    />
  </div>
</div>
```

- [ ] **Step 6: Update tampilan total di CartPanel.tsx**

Cari section cart items yang menampilkan total. Ganti bagian `Total`:

```tsx
{items.length > 0 && (
  <div className="mt-3 pt-3 border-t border-surface-high space-y-1">
    <div className="flex justify-between">
      <span className="text-xs font-body text-on-surface-variant">Subtotal</span>
      <span className="text-xs text-on-surface">{formatIDR(subtotal)}</span>
    </div>
    {(ongkosKirim > 0 || biayaPotong > 0) && (
      <>
        {ongkosKirim > 0 && (
          <div className="flex justify-between">
            <span className="text-xs font-body text-on-surface-variant">Ongkos Kirim</span>
            <span className="text-xs text-on-surface">{formatIDR(ongkosKirim)}</span>
          </div>
        )}
        {biayaPotong > 0 && (
          <div className="flex justify-between">
            <span className="text-xs font-body text-on-surface-variant">Biaya Potong</span>
            <span className="text-xs text-on-surface">{formatIDR(biayaPotong)}</span>
          </div>
        )}
      </>
    )}
    <div className="flex justify-between border-t border-surface-high pt-1">
      <span className="text-sm font-body font-semibold text-on-surface">Total</span>
      <span className="text-sm font-semibold text-primary">{formatIDR(total)}</span>
    </div>
  </div>
)}
```

- [ ] **Step 7: Update input nominal bayar ke currency format**

Cari input nominal bayar di section `/* Payment */`. Ganti:

```tsx
<input type="number" min={1} value={nominal} onChange={e => setNominal(Number(e.target.value))} className="input-field w-full" />
```

Menjadi:

```tsx
<input
  type="text"
  value={nominal ? nominal.toLocaleString('id-ID') : ''}
  onChange={e => setNominal(parseCurrency(e.target.value))}
  className="input-field w-full"
  placeholder="0"
/>
```

- [ ] **Step 8: Update handleSubmit di CartPanel.tsx — kirim biaya ke onSubmit**

Ganti pemanggilan `onSubmit({...})` di dalam `handleSubmit`:

```typescript
onSubmit({
  customerId:        cId,
  nama, hp, alamat, kelurahan, kecamatan, kode_pos, kota,
  csId,
  tellerId:          tellerId ?? null,
  salesNama,
  metodeBayar:       metode,
  tipeBayar:         tipe,
  nominalBayar:      nominal,
  rencana_pelunasan: tipe === 'DP' ? rencana : '',
  ongkosKirim,
  biayaPotong,
})
```

- [ ] **Step 9: Update canSubmit — nominal minimal 1**

Pastikan `canSubmit` tetap benar (nominal sekarang bisa 0 jika ada DP nanti). Tidak ada perubahan diperlukan — `nominal > 0` sudah benar.

- [ ] **Step 10: TypeScript check**

```bash
cd C:/Users/USER/projects/simhq/frontend
npx tsc --noEmit
```

Expected: 0 errors. Fix type errors sebelum commit.

- [ ] **Step 11: Commit**

```bash
cd C:/Users/USER/projects/simhq
git add frontend/app/\(dashboard\)/depot/pos/CartPanel.tsx \
        frontend/app/\(dashboard\)/depot/pos/page.tsx
git commit -m "feat(pos): biaya tambahan — ongkos kirim + biaya potong di cart"
```

---

## Task 6: Frontend — Fix Date Format di Transaksi Detail

### Files
- Modify: `frontend/app/(dashboard)/depot/transaksi/[id]/page.tsx`

- [ ] **Step 1: Tambah import formatDate**

Buka `frontend/app/(dashboard)/depot/transaksi/[id]/page.tsx`.

Tambah import di bagian atas:

```typescript
import { formatDate } from '@/lib/format'
```

- [ ] **Step 2: Fix tampilan tgl_bayar di tabel riwayat pembayaran**

Cari baris:

```tsx
<td className="py-2 pr-3 font-body text-on-surface">{p.tgl_bayar}</td>
```

Ganti menjadi:

```tsx
<td className="py-2 pr-3 font-body text-on-surface">{formatDate(p.tgl_bayar)}</td>
```

- [ ] **Step 3: TypeScript check**

```bash
cd C:/Users/USER/projects/simhq/frontend
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/USER/projects/simhq
git add frontend/app/\(dashboard\)/depot/transaksi/\[id\]/page.tsx
git commit -m "fix(transaksi): format tgl_bayar display using formatDate"
```

---

## Acceptance Criteria

- [ ] `transaksi` table punya kolom `ongkos_kirim` + `biaya_potong` (integer default 0)
- [ ] `POST /api/transaksi` dengan `ongkos_kirim=50000` + `biaya_potong=100000` + item `harga=6000000` → `total=6150000`
- [ ] Test `test_biaya_tambahan_masuk_ke_total` pass
- [ ] Full test suite pass — no regression
- [ ] POS CartPanel menampilkan section "Biaya Tambahan" dengan dua input
- [ ] Total di cart = subtotal item + ongkos_kirim + biaya_potong
- [ ] Input nominal bayar pakai format `Rp 50.000` (currency)
- [ ] TipeQurbanModal: THQ = "Titip ke Yayasan", PHQ = "Potong di Depot, Kirim Daging"
- [ ] PreorderModal: sama dengan TipeQurbanModal labels, format deskriptif
- [ ] Tanggal di detail transaksi tampil "3 Mei 2026" bukan raw ISO/timezone string
- [ ] TypeScript: 0 errors
