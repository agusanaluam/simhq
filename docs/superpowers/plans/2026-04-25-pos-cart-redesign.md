# POS Cart Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign POS from single-item wizard to split-panel cart supporting multi-item mixed-jenis transactions with one invoice.

**Architecture:** Add `transaksi_items` table; make old transaksi per-animal columns nullable (backward compat); update `TransaksiController::store()` to accept items array and set `harga = SUM(items.harga)`; replace POS wizard with HewanBrowser + CartPanel split layout. No TDD — implement directly, run full suite at end.

**Tech Stack:** Laravel 11, PostgreSQL, Next.js 14 App Router, TypeScript, Tailwind CSS, `@dnd-kit` (not used in this feature), existing `api` lib, `useSession`.

---

## File Map

| Action | File |
|--------|------|
| Create | `backend/database/migrations/2026_04_25_020000_create_transaksi_items_table.php` |
| Create | `backend/database/migrations/2026_04_25_020001_make_transaksi_legacy_fields_nullable.php` |
| Create | `backend/app/Models/TransaksiItem.php` |
| Modify | `backend/app/Models/Transaksi.php` |
| Modify | `backend/app/Http/Requests/StoreTransaksiRequest.php` |
| Modify | `backend/app/Http/Controllers/TransaksiController.php` |
| Modify | `backend/tests/Feature/POS/POSImprovementsTest.php` |
| Delete | `frontend/app/(dashboard)/depot/pos/StepJenisKelas.tsx` |
| Delete | `frontend/app/(dashboard)/depot/pos/StepPilihHewan.tsx` |
| Delete | `frontend/app/(dashboard)/depot/pos/StepDataPembeli.tsx` |
| Delete | `frontend/app/(dashboard)/depot/pos/StepReview.tsx` |
| Create | `frontend/app/(dashboard)/depot/pos/TipeQurbanModal.tsx` |
| Create | `frontend/app/(dashboard)/depot/pos/PreorderModal.tsx` |
| Create | `frontend/app/(dashboard)/depot/pos/HewanBrowser.tsx` |
| Create | `frontend/app/(dashboard)/depot/pos/CartPanel.tsx` |
| Rewrite | `frontend/app/(dashboard)/depot/pos/page.tsx` |

---

## Task 1: Backend Migrations

**Files:**
- Create: `backend/database/migrations/2026_04_25_020000_create_transaksi_items_table.php`
- Create: `backend/database/migrations/2026_04_25_020001_make_transaksi_legacy_fields_nullable.php`

- [ ] **Step 1: Create transaksi_items migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('transaksi_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaksi_id')->constrained('transaksi')->cascadeOnDelete();
            $table->foreignId('hewan_id')->nullable()->constrained('hewan')->nullOnDelete();
            $table->enum('jenis', ['SAPI', 'DOMBA']);
            $table->foreignId('kelas_id')->constrained('kelas_hewan')->restrictOnDelete();
            $table->enum('tipe_qurban', ['SHQ', 'THQ', 'PHQ']);
            $table->unsignedInteger('harga')->default(0);
            $table->boolean('is_preorder')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('transaksi_items'); }
};
```

- [ ] **Step 2: Create nullable migration for legacy transaksi fields**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement('ALTER TABLE transaksi ALTER COLUMN tipe_qurban DROP NOT NULL');
        DB::statement('ALTER TABLE transaksi ALTER COLUMN jenis DROP NOT NULL');
        DB::statement('ALTER TABLE transaksi ALTER COLUMN kelas_id DROP NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE transaksi ALTER COLUMN tipe_qurban SET NOT NULL');
        DB::statement('ALTER TABLE transaksi ALTER COLUMN jenis SET NOT NULL');
        DB::statement('ALTER TABLE transaksi ALTER COLUMN kelas_id SET NOT NULL');
    }
};
```

- [ ] **Step 3: Run migrations**

```bash
php artisan migrate
```

Expected: both migrations DONE.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/2026_04_25_020000_create_transaksi_items_table.php \
        database/migrations/2026_04_25_020001_make_transaksi_legacy_fields_nullable.php
git commit -m "feat(pos): add transaksi_items table; make legacy transaksi fields nullable"
```

---

## Task 2: Backend — Model + Request

**Files:**
- Create: `backend/app/Models/TransaksiItem.php`
- Modify: `backend/app/Models/Transaksi.php`
- Modify: `backend/app/Http/Requests/StoreTransaksiRequest.php`

- [ ] **Step 1: Create TransaksiItem model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransaksiItem extends Model
{
    protected $table = 'transaksi_items';

    protected $fillable = [
        'transaksi_id', 'hewan_id', 'jenis', 'kelas_id',
        'tipe_qurban', 'harga', 'is_preorder',
    ];

    protected $casts = [
        'is_preorder' => 'boolean',
        'harga'       => 'integer',
    ];

    public function transaksi(): BelongsTo { return $this->belongsTo(Transaksi::class); }
    public function hewan(): BelongsTo    { return $this->belongsTo(Hewan::class); }
    public function kelas(): BelongsTo    { return $this->belongsTo(KelasHewan::class, 'kelas_id'); }
}
```

- [ ] **Step 2: Add items relation to Transaksi model**

In `backend/app/Models/Transaksi.php`, add after the last `HasMany` relation:
```php
    public function items(): HasMany { return $this->hasMany(TransaksiItem::class); }
```

Note: `HasMany` is already imported. No changes to `$fillable` or `$casts`.

- [ ] **Step 3: Update StoreTransaksiRequest**

Replace the entire `rules()` method in `backend/app/Http/Requests/StoreTransaksiRequest.php`:

```php
    public function rules(): array
    {
        return [
            'depot_id'    => ['required', 'exists:depots,id'],
            'customer_id' => ['required', 'exists:customers,id'],
            'cs_id'       => ['nullable', 'exists:users,id'],
            'teller_id'   => ['nullable', 'exists:users,id'],
            'sales_id'    => ['nullable', 'exists:users,id'],
            'yayasan_id'  => ['nullable', 'exists:yayasan,id'],
            'musim'       => ['required', 'integer', 'min:2020', 'max:2100'],
            'catatan'     => ['nullable', 'string', 'max:500'],
            'sales_nama'        => ['nullable', 'string', 'max:100'],
            'rencana_pelunasan' => ['nullable', 'date'],

            // Legacy single-item fields (nullable for backward compat)
            'hewan_id'    => ['nullable', 'exists:hewan,id'],
            'jenis'       => ['nullable', 'in:SAPI,DOMBA'],
            'kelas_id'    => ['nullable', 'exists:kelas_hewan,id'],
            'tipe_qurban' => ['nullable', 'in:SHQ,THQ,PHQ'],

            // Cart items
            'items'                  => ['required', 'array', 'min:1'],
            'items.*.hewan_id'       => ['nullable', 'exists:hewan,id'],
            'items.*.jenis'          => ['required', 'in:SAPI,DOMBA'],
            'items.*.kelas_id'       => ['required', 'exists:kelas_hewan,id'],
            'items.*.tipe_qurban'    => ['required', 'in:SHQ,THQ,PHQ'],
            'items.*.harga'          => ['required', 'integer', 'min:0'],
            'items.*.is_preorder'    => ['required', 'boolean'],
        ];
    }
```

- [ ] **Step 4: Commit**

```bash
git add app/Models/TransaksiItem.php \
        app/Models/Transaksi.php \
        app/Http/Requests/StoreTransaksiRequest.php
git commit -m "feat(pos): add TransaksiItem model; update StoreTransaksiRequest for cart items"
```

---

## Task 3: Backend — TransaksiController + Fix Test + Run Suite

**Files:**
- Modify: `backend/app/Http/Controllers/TransaksiController.php`
- Modify: `backend/tests/Feature/POS/POSImprovementsTest.php`

- [ ] **Step 1: Update TransaksiController imports**

In `backend/app/Http/Controllers/TransaksiController.php`, find the existing imports and add:
```php
use App\Models\Hewan;
use App\Models\TransaksiItem;
use Illuminate\Support\Arr;
```

(Keep existing imports: `StatusHewan`, `StatusTransaksi`, `StoreTransaksiRequest`, `HargaKelas`, `Transaksi`, `TransaksiService`, `JsonResponse`, `Request`, `DB`)

- [ ] **Step 2: Replace store() method**

Find the entire `store()` method (from `public function store(` to its closing `}`). Replace with:

```php
    public function store(StoreTransaksiRequest $request): JsonResponse
    {
        $data       = $request->validated();
        $items      = $data['items'] ?? [];
        $totalHarga = collect($items)->sum('harga');

        $hasPreorder  = collect($items)->contains('is_preorder', true);
        $status       = $hasPreorder
            ? StatusTransaksi::MENUNGGU_HEWAN->value
            : StatusTransaksi::HEWAN_TERALOKASI->value;

        $transaksi = DB::transaction(function () use ($data, $items, $totalHarga, $status) {
            $noFaktur = $this->svc->generateNoFaktur($data['depot_id'], $data['musim']);

            $transaksi = Transaksi::create(array_merge(
                Arr::except($data, ['items']),
                [
                    'no_faktur'        => $noFaktur,
                    'harga'            => $totalHarga,
                    'total'            => $totalHarga,
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

- [ ] **Step 3: Fix POSImprovementsTest — add items to transaksi store test**

In `backend/tests/Feature/POS/POSImprovementsTest.php`, find `test_transaksi_store_accepts_sales_nama_and_rencana_pelunasan` and replace it with:

```php
    public function test_transaksi_store_accepts_sales_nama_and_rencana_pelunasan(): void
    {
        $customer = Customer::create(['nama' => 'Test', 'hp' => '081234567890']);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/transaksi', [
                'depot_id'           => $this->depot->id,
                'customer_id'        => $customer->id,
                'musim'              => 2026,
                'sales_nama'         => 'Andi Sales',
                'rencana_pelunasan'  => '2026-06-01',
                'items'              => [
                    [
                        'jenis'       => 'SAPI',
                        'kelas_id'    => $this->kelas->id,
                        'tipe_qurban' => 'SHQ',
                        'harga'       => 1_000_000,
                        'is_preorder' => true,
                        'hewan_id'    => null,
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('transaksi.sales_nama', 'Andi Sales');
    }
```

- [ ] **Step 4: Run full test suite**

```bash
php artisan test --no-coverage
```

Expected: all tests pass (the 3 POSImprovementsTest pass, all other tests unchanged since we didn't drop columns).

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/TransaksiController.php \
        tests/Feature/POS/POSImprovementsTest.php
git commit -m "feat(pos): cart-based TransaksiController::store(); fix POSImprovementsTest"
```

---

## Task 4: Frontend — TipeQurbanModal + PreorderModal

**Files:**
- Create: `frontend/app/(dashboard)/depot/pos/TipeQurbanModal.tsx`
- Create: `frontend/app/(dashboard)/depot/pos/PreorderModal.tsx`

- [ ] **Step 1: Create TipeQurbanModal.tsx**

```tsx
'use client'

import { useState } from 'react'

export interface HewanForCart {
  id: number
  no_hewan: string
  jenis: string
  kelas_jual: { id: number; kode: string } | null
  bobot_masuk: string
}

interface Props {
  hewan: HewanForCart
  harga: number
  onConfirm: (tipeQurban: string) => void
  onClose: () => void
}

const TIPE_OPTIONS = [
  { value: 'SHQ', label: 'SHQ – Kirim Hidup' },
  { value: 'THQ', label: 'THQ – Sembelih di Depot' },
  { value: 'PHQ', label: 'PHQ – Sembelih + Kirim' },
]

export function TipeQurbanModal({ hewan, harga, onConfirm, onClose }: Props) {
  const [tipe, setTipe] = useState('SHQ')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface-lowest rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="font-display font-bold text-lg text-on-surface mb-1">
          Hewan #{hewan.no_hewan}
        </h2>
        <p className="text-sm text-on-surface-variant mb-4 font-body">
          {hewan.jenis} · {hewan.kelas_jual?.kode ?? '—'} · {hewan.bobot_masuk} kg
          {harga > 0 && (
            <span className="ml-2 text-primary font-medium">
              · {harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
            </span>
          )}
        </p>

        <div className="space-y-2 mb-6">
          {TIPE_OPTIONS.map(t => (
            <label
              key={t.value}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                tipe === t.value ? 'border-primary bg-surface-high' : 'border-surface-high'
              }`}
            >
              <input
                type="radio"
                name="tipe"
                value={t.value}
                checked={tipe === t.value}
                onChange={() => setTipe(t.value)}
                className="accent-primary"
              />
              <span className="text-sm font-body text-on-surface">{t.label}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-body font-medium text-on-surface-variant hover:bg-surface-high transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(tipe)}
            className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Tambah ke Cart
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create PreorderModal.tsx**

```tsx
'use client'

import { useState } from 'react'

interface KelasHewan { id: number; kode: string; nama: string }
interface HargaEntry { kelas_id: number; jenis: string; harga_jual: number }

interface Props {
  kelasList: KelasHewan[]
  hargaList: HargaEntry[]
  onConfirm: (item: { jenis: string; kelasId: number; kelasKode: string; tipeQurban: string; harga: number }) => void
  onClose: () => void
}

const TIPE_OPTIONS = ['SHQ', 'THQ', 'PHQ']

export function PreorderModal({ kelasList, hargaList, onConfirm, onClose }: Props) {
  const [jenis,   setJenis]   = useState('SAPI')
  const [kelasId, setKelasId] = useState<number | null>(null)
  const [tipe,    setTipe]    = useState('SHQ')

  function getHarga(): number {
    if (!kelasId) return 0
    return hargaList.find(h => h.kelas_id === kelasId && h.jenis === jenis)?.harga_jual ?? 0
  }

  function handleConfirm() {
    if (!kelasId) return
    const kelas = kelasList.find(k => k.id === kelasId)!
    onConfirm({ jenis, kelasId, kelasKode: kelas.kode, tipeQurban: tipe, harga: getHarga() })
  }

  const harga = getHarga()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface-lowest rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="font-display font-bold text-lg text-on-surface mb-4">Tambah Pre-order</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">Jenis</label>
            <div className="flex gap-2">
              {(['SAPI', 'DOMBA'] as const).map(j => (
                <button
                  key={j}
                  type="button"
                  onClick={() => { setJenis(j); setKelasId(null) }}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-body transition-colors ${
                    jenis === j ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
                  }`}
                >
                  {j === 'SAPI' ? 'Sapi' : 'Domba'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">Kelas</label>
            <select
              value={kelasId ?? ''}
              onChange={e => setKelasId(e.target.value ? Number(e.target.value) : null)}
              className="input-field w-full"
            >
              <option value="">Pilih kelas...</option>
              {kelasList.map(k => {
                const h = hargaList.find(h => h.kelas_id === k.id && h.jenis === jenis)
                return (
                  <option key={k.id} value={k.id}>
                    {k.kode} {h ? `– ${h.harga_jual.toLocaleString('id-ID')}` : '(no price)'}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">Tipe Qurban</label>
            <div className="flex gap-2">
              {TIPE_OPTIONS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipe(t)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm font-body transition-colors ${
                    tipe === t ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {kelasId && harga > 0 && (
            <p className="text-sm font-body text-primary font-medium">
              Harga: {harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-body font-medium text-on-surface-variant hover:bg-surface-high transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!kelasId}
            className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            Tambah ke Cart
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git -C C:/Users/USER/projects/simhq add "frontend/app/(dashboard)/depot/pos/TipeQurbanModal.tsx" \
        "frontend/app/(dashboard)/depot/pos/PreorderModal.tsx"
git -C C:/Users/USER/projects/simhq commit -m "feat(pos): add TipeQurbanModal and PreorderModal"
```

---

## Task 5: Frontend — HewanBrowser

**Files:**
- Create: `frontend/app/(dashboard)/depot/pos/HewanBrowser.tsx`

- [ ] **Step 1: Create HewanBrowser.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { TipeQurbanModal, type HewanForCart } from './TipeQurbanModal'
import { PreorderModal } from './PreorderModal'
import type { CartItem } from './page'
import api from '@/lib/api'

interface KelasHewan { id: number; kode: string; nama: string }
interface HargaEntry  { kelas_id: number; jenis: string; harga_jual: number }

interface Props {
  musim: number
  depotId: number | undefined
  onAdd: (item: CartItem) => void
}

export function HewanBrowser({ musim, depotId, onAdd }: Props) {
  const [jenis,        setJenis]        = useState<'SAPI' | 'DOMBA'>('SAPI')
  const [kelasFilter,  setKelasFilter]  = useState<string>('')
  const [hewan,        setHewan]        = useState<HewanForCart[]>([])
  const [kelasList,    setKelasList]    = useState<KelasHewan[]>([])
  const [hargaList,    setHargaList]    = useState<HargaEntry[]>([])
  const [loading,      setLoading]      = useState(false)
  const [selected,     setSelected]     = useState<HewanForCart | null>(null)
  const [showPreorder, setShowPreorder] = useState(false)

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelasList(r.data.data ?? []))
    api.get(`/api/master/harga?musim=${musim}`).then(r => setHargaList(r.data.data ?? []))
  }, [musim])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ status: 'AVAILABLE', jenis })
    if (kelasFilter) params.set('kelas', kelasFilter)
    if (depotId)     params.set('depot', String(depotId))
    params.set('musim', String(musim))
    api.get(`/api/hewan?${params}&per_page=100`)
      .then(r => setHewan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [jenis, kelasFilter, depotId, musim])

  function getHarga(kelasId: number, j: string): number {
    return hargaList.find(h => h.kelas_id === kelasId && h.jenis === j)?.harga_jual ?? 0
  }

  function handleHewanConfirm(tipeQurban: string) {
    if (!selected || !selected.kelas_jual) return
    onAdd({
      tempId:      crypto.randomUUID(),
      hewanId:     selected.id,
      noHewan:     selected.no_hewan,
      jenis:       selected.jenis,
      kelasId:     selected.kelas_jual.id,
      kelasKode:   selected.kelas_jual.kode,
      tipeQurban,
      harga:       getHarga(selected.kelas_jual.id, selected.jenis),
      isPreorder:  false,
    })
    setSelected(null)
  }

  function handlePreorderConfirm(item: { jenis: string; kelasId: number; kelasKode: string; tipeQurban: string; harga: number }) {
    onAdd({
      tempId:     crypto.randomUUID(),
      hewanId:    null,
      noHewan:    null,
      jenis:      item.jenis,
      kelasId:    item.kelasId,
      kelasKode:  item.kelasKode,
      tipeQurban: item.tipeQurban,
      harga:      item.harga,
      isPreorder: true,
    })
    setShowPreorder(false)
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex bg-surface-high rounded-xl p-1 gap-1">
          {(['SAPI', 'DOMBA'] as const).map(j => (
            <button
              key={j}
              onClick={() => { setJenis(j); setKelasFilter('') }}
              className={`px-4 py-1.5 rounded-lg text-sm font-body font-medium transition-colors ${
                jenis === j ? 'bg-surface-lowest text-on-surface shadow-card' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {j === 'SAPI' ? 'Sapi' : 'Domba'}
            </button>
          ))}
        </div>

        <select value={kelasFilter} onChange={e => setKelasFilter(e.target.value)} className="input-field w-36">
          <option value="">Semua Kelas</option>
          {kelasList.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
        </select>

        <button
          onClick={() => setShowPreorder(true)}
          className="px-3 py-1.5 rounded-xl border border-primary text-primary text-sm font-body hover:bg-primary/5 transition-colors"
        >
          + Pre-order
        </button>

        <span className="text-xs text-on-surface-variant font-body ml-auto">
          {hewan.length} ekor tersedia
        </span>
      </div>

      {/* Hewan grid */}
      {loading ? (
        <p className="text-sm text-on-surface-variant py-8 text-center">Memuat...</p>
      ) : hewan.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-8 text-center italic">Tidak ada hewan tersedia.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {hewan.map(h => {
            const harga = h.kelas_jual ? getHarga(h.kelas_jual.id, h.jenis) : 0
            return (
              <button
                key={h.id}
                onClick={() => setSelected(h)}
                className="p-3 rounded-xl border-2 border-surface-high bg-surface-lowest text-left hover:border-primary/50 hover:bg-surface-high transition-colors"
              >
                <p className="font-display font-bold text-primary text-sm">#{h.no_hewan}</p>
                <p className="text-xs text-on-surface-variant font-body">{h.kelas_jual?.kode ?? '—'} · {h.bobot_masuk} kg</p>
                {harga > 0 && (
                  <p className="text-xs font-medium text-on-surface mt-0.5">
                    {harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <TipeQurbanModal
          hewan={selected}
          harga={selected.kelas_jual ? getHarga(selected.kelas_jual.id, selected.jenis) : 0}
          onConfirm={handleHewanConfirm}
          onClose={() => setSelected(null)}
        />
      )}

      {showPreorder && (
        <PreorderModal
          kelasList={kelasList}
          hargaList={hargaList}
          onConfirm={handlePreorderConfirm}
          onClose={() => setShowPreorder(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C C:/Users/USER/projects/simhq add "frontend/app/(dashboard)/depot/pos/HewanBrowser.tsx"
git -C C:/Users/USER/projects/simhq commit -m "feat(pos): add HewanBrowser component"
```

---

## Task 6: Frontend — CartPanel

**Files:**
- Create: `frontend/app/(dashboard)/depot/pos/CartPanel.tsx`

- [ ] **Step 1: Create CartPanel.tsx**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/Input'
import type { CartItem, CartSubmitData } from './page'
import api from '@/lib/api'

interface Customer { id: number; nama: string; hp: string; alamat: string | null; kelurahan: string | null; kecamatan: string | null; kode_pos: string | null; kota: string | null }
interface CsUser   { id: number; name: string }

interface Props {
  items: CartItem[]
  onRemove: (tempId: string) => void
  onSubmit: (data: CartSubmitData) => void
  submitting: boolean
}

const METODE_OPTIONS = [
  { value: 'CASH',          label: 'Cash' },
  { value: 'TRANSFER_BCA',  label: 'Transfer BCA' },
  { value: 'TRANSFER_LAIN', label: 'Transfer Lain' },
]

export function CartPanel({ items, onRemove, onSubmit, submitting }: Props) {
  const { data: session } = useSession()
  const sessionUser       = (session?.user as any)
  const tellerId          = sessionUser?.id as number | undefined
  const tellerName        = sessionUser?.name as string | undefined

  // Customer
  const [nama,       setNama]       = useState('')
  const [hp,         setHp]         = useState('')
  const [alamat,     setAlamat]     = useState('')
  const [kelurahan,  setKelurahan]  = useState('')
  const [kecamatan,  setKecamatan]  = useState('')
  const [kode_pos,   setKodePOS]    = useState('')
  const [kota,       setKota]       = useState('')
  const [suggestions, setSuggestions] = useState<Customer[]>([])
  const [showSug,    setShowSug]    = useState(false)
  const customerId = useRef<number | null>(null)
  const debounce   = useRef<ReturnType<typeof setTimeout>>()

  // Staff
  const [csUsers,   setCsUsers]   = useState<CsUser[]>([])
  const [csId,      setCsId]      = useState<number | null>(null)
  const [salesNama, setSalesNama] = useState('')

  // Payment
  const [metode,  setMetode]  = useState('CASH')
  const [tipe,    setTipe]    = useState('PELUNASAN')
  const [nominal, setNominal] = useState(0)
  const [rencana, setRencana] = useState('')

  const total = items.reduce((sum, i) => sum + i.harga, 0)

  useEffect(() => {
    setNominal(total)
  }, [total])

  useEffect(() => {
    api.get('/api/users?role=CS_KETUA,CS_ANGGOTA').then(r => setCsUsers(r.data.data ?? []))
  }, [])

  function searchCustomer(q: string) {
    customerId.current = null
    clearTimeout(debounce.current)
    if (q.length < 2) { setSuggestions([]); setShowSug(false); return }
    debounce.current = setTimeout(() => {
      api.get(`/api/customer?q=${encodeURIComponent(q)}`)
        .then(r => { setSuggestions(r.data.data ?? []); setShowSug(true) })
    }, 300)
  }

  function selectCustomer(c: Customer) {
    customerId.current = c.id
    setNama(c.nama); setHp(c.hp ?? ''); setAlamat(c.alamat ?? '')
    setKelurahan(c.kelurahan ?? ''); setKecamatan(c.kecamatan ?? '')
    setKodePOS(c.kode_pos ?? ''); setKota(c.kota ?? '')
    setSuggestions([]); setShowSug(false)
  }

  async function handleSubmit() {
    if (items.length === 0 || !nama.trim()) return

    let cId = customerId.current
    if (!cId) {
      const res = await api.post('/api/customer', { nama, hp, alamat, kelurahan, kecamatan, kode_pos, kota })
      cId = res.data.customer.id as number
    }

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
    })
  }

  const canSubmit = items.length > 0 && nama.trim() !== '' && nominal > 0 && (tipe === 'PELUNASAN' || rencana !== '')

  return (
    <div className="bg-surface-lowest rounded-2xl border border-surface-high flex flex-col gap-0">
      {/* Cart items */}
      <div className="p-4 border-b border-surface-high">
        <h3 className="font-display font-semibold text-on-surface mb-3 text-sm">
          Cart ({items.length} item)
        </h3>

        {items.length === 0 ? (
          <p className="text-sm text-on-surface-variant italic text-center py-4">Cart kosong</p>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.tempId} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium text-on-surface">
                    {item.isPreorder ? `Pre-order` : `#${item.noHewan}`}
                    {' '}<span className="text-on-surface-variant font-normal">{item.jenis} {item.kelasKode} {item.tipeQurban}</span>
                  </p>
                  <p className="text-xs text-primary">
                    {item.harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(item.tempId)}
                  className="text-error hover:opacity-70 text-sm px-1 flex-shrink-0"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="flex justify-between mt-3 pt-3 border-t border-surface-high">
            <span className="text-sm font-body font-semibold text-on-surface">Total</span>
            <span className="text-sm font-semibold text-primary">
              {total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
      </div>

      {/* Customer */}
      <div className="p-4 border-b border-surface-high space-y-3">
        <h3 className="font-display font-semibold text-on-surface text-sm">Data Pembeli</h3>

        <div className="relative">
          <Input
            label="Nama *"
            value={nama}
            onChange={e => { setNama(e.target.value); searchCustomer(e.target.value) }}
            onFocus={() => suggestions.length > 0 && setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 150)}
            placeholder="Cari pelanggan atau isi baru..."
          />
          {showSug && suggestions.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 bg-surface-lowest border border-surface-high rounded-xl shadow-card mt-1 max-h-40 overflow-y-auto">
              {suggestions.map(c => (
                <button key={c.id} onMouseDown={() => selectCustomer(c)}
                  className="w-full text-left px-3 py-2 hover:bg-surface-high text-sm font-body">
                  <span className="font-medium text-on-surface">{c.nama}</span>
                  <span className="text-on-surface-variant ml-2 text-xs">{c.hp}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Input label="No HP" value={hp} onChange={e => setHp(e.target.value)} placeholder="08..." />
        <Input label="Alamat" value={alamat} onChange={e => setAlamat(e.target.value)} placeholder="Jalan, RT/RW..." />

        <div className="grid grid-cols-2 gap-2">
          <Input label="Kelurahan" value={kelurahan} onChange={e => setKelurahan(e.target.value)} placeholder="Kelurahan..." />
          <Input label="Kecamatan" value={kecamatan} onChange={e => setKecamatan(e.target.value)} placeholder="Kecamatan..." />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Kode Pos"  value={kode_pos}  onChange={e => setKodePOS(e.target.value)}   placeholder="12345" />
          <Input label="Kota"      value={kota}      onChange={e => setKota(e.target.value)}       placeholder="Nama kota..." />
        </div>
      </div>

      {/* Staff */}
      <div className="p-4 border-b border-surface-high space-y-3">
        <h3 className="font-display font-semibold text-on-surface text-sm">Staff</h3>

        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">CS</label>
          <select value={csId ?? ''} onChange={e => setCsId(e.target.value ? Number(e.target.value) : null)} className="input-field w-full">
            <option value="">— Tidak ada —</option>
            {csUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Teller</label>
          <div className="input-field bg-surface-high text-on-surface-variant cursor-not-allowed select-none">
            {tellerName ?? '—'}
          </div>
        </div>

        <Input label="Sales" value={salesNama} onChange={e => setSalesNama(e.target.value)} placeholder="Nama sales..." />
      </div>

      {/* Payment */}
      <div className="p-4 border-b border-surface-high space-y-3">
        <h3 className="font-display font-semibold text-on-surface text-sm">Pembayaran</h3>

        <div>
          <label className="block text-xs font-body text-on-surface-variant mb-1.5">Metode</label>
          <div className="flex gap-1.5 flex-wrap">
            {METODE_OPTIONS.map(m => (
              <button key={m.value} type="button" onClick={() => setMetode(m.value)}
                className={`px-3 py-1.5 rounded-lg border-2 text-xs font-body transition-colors ${
                  metode === m.value ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface hover:border-primary/50'
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-body text-on-surface-variant mb-1.5">Skema</label>
          <div className="flex gap-2">
            {[{ value: 'PELUNASAN', label: 'Lunas' }, { value: 'DP', label: 'DP' }].map(t => (
              <button key={t.value} type="button" onClick={() => setTipe(t.value)}
                className={`px-4 py-1.5 rounded-lg border-2 text-sm font-body transition-colors ${
                  tipe === t.value ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface hover:border-primary/50'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">
            Nominal {tipe === 'DP' ? 'DP' : 'Pembayaran'}
          </label>
          <input type="number" min={1} value={nominal} onChange={e => setNominal(Number(e.target.value))} className="input-field w-full" />
        </div>

        {tipe === 'DP' && (
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">Rencana Pelunasan *</label>
            <input type="date" value={rencana} onChange={e => setRencana(e.target.value)} className="input-field w-full" />
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="p-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full py-3 rounded-xl text-sm font-body font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {submitting ? 'Memproses...' : `Proses Transaksi (${items.length} item)`}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C C:/Users/USER/projects/simhq add "frontend/app/(dashboard)/depot/pos/CartPanel.tsx"
git -C C:/Users/USER/projects/simhq commit -m "feat(pos): add CartPanel with customer, staff, payment, submit"
```

---

## Task 7: Frontend — page.tsx Rewrite + Delete Old Steps

**Files:**
- Delete: `frontend/app/(dashboard)/depot/pos/StepJenisKelas.tsx`
- Delete: `frontend/app/(dashboard)/depot/pos/StepPilihHewan.tsx`
- Delete: `frontend/app/(dashboard)/depot/pos/StepDataPembeli.tsx`
- Delete: `frontend/app/(dashboard)/depot/pos/StepReview.tsx`
- Rewrite: `frontend/app/(dashboard)/depot/pos/page.tsx`

- [ ] **Step 1: Delete old wizard step files**

```bash
git -C C:/Users/USER/projects/simhq rm "frontend/app/(dashboard)/depot/pos/StepJenisKelas.tsx" \
    "frontend/app/(dashboard)/depot/pos/StepPilihHewan.tsx" \
    "frontend/app/(dashboard)/depot/pos/StepDataPembeli.tsx" \
    "frontend/app/(dashboard)/depot/pos/StepReview.tsx"
```

- [ ] **Step 2: Write new page.tsx**

Replace entire content of `frontend/app/(dashboard)/depot/pos/page.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { HewanBrowser } from './HewanBrowser'
import { CartPanel } from './CartPanel'
import api from '@/lib/api'

const MUSIM = new Date().getFullYear()

export interface CartItem {
  tempId: string
  hewanId: number | null
  noHewan: string | null
  jenis: string
  kelasId: number
  kelasKode: string
  tipeQurban: string
  harga: number
  isPreorder: boolean
}

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
}

export default function POSPage() {
  const router            = useRouter()
  const { data: session } = useSession()
  const depotId           = (session?.user as any)?.depotId as number | undefined

  const [cart,       setCart]       = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  function addItem(item: CartItem) {
    setCart(prev => [...prev, item])
  }

  function removeItem(tempId: string) {
    setCart(prev => prev.filter(i => i.tempId !== tempId))
  }

  async function handleSubmit(data: CartSubmitData) {
    if (!depotId) { setError('Depot tidak ditemukan di sesi.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post('/api/transaksi', {
        depot_id:           depotId,
        customer_id:        data.customerId,
        cs_id:              data.csId,
        teller_id:          data.tellerId,
        sales_id:           null,
        sales_nama:         data.salesNama || null,
        rencana_pelunasan:  data.rencana_pelunasan || null,
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
      const transaksiId = res.data.transaksi.id

      await api.post(`/api/transaksi/${transaksiId}/bayar`, {
        jumlah:    data.nominalBayar,
        tipe:      data.tipeBayar,
        metode:    data.metodeBayar,
        teller_id: data.tellerId,
        tgl_bayar: new Date().toISOString().split('T')[0],
      })

      router.push('/depot/transaksi')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Gagal memproses transaksi.')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display font-bold text-2xl text-on-surface">POS Penjualan</h1>
        <p className="text-sm text-on-surface-variant mt-1">Pilih hewan → tambah ke cart → proses</p>
      </div>

      {error && (
        <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md mb-4">{error}</p>
      )}

      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <HewanBrowser
            musim={MUSIM}
            depotId={depotId}
            onAdd={addItem}
          />
        </div>

        <div className="w-80 xl:w-96 flex-shrink-0">
          <CartPanel
            items={cart}
            onRemove={removeItem}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git -C C:/Users/USER/projects/simhq add "frontend/app/(dashboard)/depot/pos/page.tsx"
git -C C:/Users/USER/projects/simhq commit -m "feat(pos): cart-based POS page with HewanBrowser + CartPanel split layout"
```
