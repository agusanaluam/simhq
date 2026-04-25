# Pengadaan Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `no_pengadaan` batch audit number per procurement action, make `kelas_jual_id` nullable with "Belum Dikelas" chip indicator, and add Kelas Beli column + kelas filter to the pengadaan table.

**Architecture:** New `no_pengadaan` (unsignedSmallInteger) column on `hewan` table auto-allocated via two new `HewanService` methods. `kelas_jual_id` made nullable via raw ALTER statement. Controller `store()` wraps both allocations in one outer transaction; `storeBulk()` allocates one `no_pengadaan` for the whole batch. Frontend table gains Pengadaan + Kelas Beli columns; Kelas Jual shows amber chip when null; new kelas dropdown filter sends `?kelas=UNCLASSED` for null filter.

**Tech Stack:** Laravel 11, PostgreSQL, Next.js 14 App Router, TypeScript, Tailwind CSS, existing UI primitives.

---

## File Map

| Action | File |
|--------|------|
| Create | `backend/database/migrations/2026_04_25_000000_improve_hewan_pengadaan.php` |
| Modify | `backend/app/Models/Hewan.php` |
| Modify | `backend/app/Services/HewanService.php` |
| Modify | `backend/app/Http/Controllers/HewanController.php` |
| Modify | `backend/app/Http/Requests/StoreHewanRequest.php` |
| Modify | `backend/app/Http/Requests/BulkStoreHewanRequest.php` |
| Modify | `backend/app/Http/Requests/UpdateHewanRequest.php` |
| Create | `backend/tests/Feature/Hewan/HewanPengadaanTest.php` |
| Modify | `frontend/app/(dashboard)/depot/pengadaan/page.tsx` |
| Modify | `frontend/app/(dashboard)/depot/pengadaan/TambahHewanModal.tsx` |
| Modify | `frontend/app/(dashboard)/depot/pengadaan/BulkTambahHewanModal.tsx` |

---

## Task 1: Migration — add no_pengadaan + nullable kelas_jual_id

**Files:**
- Create: `backend/database/migrations/2026_04_25_000000_improve_hewan_pengadaan.php`

- [ ] **Step 1: Create migration file**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('hewan', function (Blueprint $table) {
            $table->unsignedSmallInteger('no_pengadaan')->default(0)->after('musim');
        });

        DB::statement('ALTER TABLE hewan ALTER COLUMN kelas_jual_id DROP NOT NULL');
    }

    public function down(): void
    {
        Schema::table('hewan', function (Blueprint $table) {
            $table->dropColumn('no_pengadaan');
        });

        DB::statement('ALTER TABLE hewan ALTER COLUMN kelas_jual_id SET NOT NULL');
    }
};
```

Note: `DB::statement` used for nullable change — avoids `doctrine/dbal` dependency and works reliably on PostgreSQL.

- [ ] **Step 2: Run migration**

```bash
cd backend && php artisan migrate
```

Expected:
```
Running migrations.
2026_04_25_000000_improve_hewan_pengadaan ........... DONE
```

- [ ] **Step 3: Commit**

```bash
git add backend/database/migrations/2026_04_25_000000_improve_hewan_pengadaan.php
git commit -m "feat(pengadaan): add no_pengadaan column; make kelas_jual_id nullable"
```

---

## Task 2: HewanService + Hewan Model

**Files:**
- Modify: `backend/app/Services/HewanService.php`
- Modify: `backend/app/Models/Hewan.php`

- [ ] **Step 1: Add allocateNoPengadaan + generateNoPengadaan to HewanService**

In `backend/app/Services/HewanService.php`, add these two methods after `allocateNoHewan()` (before `generateQrSvg`):

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

- [ ] **Step 2: Add no_pengadaan to Hewan model fillable**

In `backend/app/Models/Hewan.php`, find:
```php
    protected $fillable = [
        'depot_id', 'supplier_id', 'kelas_asal_id', 'kelas_jual_id',
        'no_hewan', 'jenis', 'bobot_masuk', 'bobot_terkini',
        'tgl_masuk', 'musim', 'status', 'petak_id',
    ];
```

Replace with:
```php
    protected $fillable = [
        'depot_id', 'supplier_id', 'kelas_asal_id', 'kelas_jual_id',
        'no_hewan', 'no_pengadaan', 'jenis', 'bobot_masuk', 'bobot_terkini',
        'tgl_masuk', 'musim', 'status', 'petak_id',
    ];
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/Services/HewanService.php backend/app/Models/Hewan.php
git commit -m "feat(pengadaan): add allocateNoPengadaan to HewanService; add no_pengadaan to fillable"
```

---

## Task 3: Write Failing Tests (TDD)

**Files:**
- Create: `backend/tests/Feature/Hewan/HewanPengadaanTest.php`

- [ ] **Step 1: Create the test file**

```php
<?php
namespace Tests\Feature\Hewan;

use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HewanPengadaanTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;
    private KelasHewan $kelas;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->depot      = Depot::factory()->create();
        $this->kelas      = KelasHewan::create(['kode' => 'A', 'nama' => 'A', 'urutan' => 4]);
    }

    private function hewanPayload(array $override = []): array
    {
        return array_merge([
            'depot_id'      => $this->depot->id,
            'supplier_id'   => null,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300,
            'tgl_masuk'     => '2026-05-01',
            'musim'         => 2026,
        ], $override);
    }

    private function bulkPayload(int $count = 3, array $override = []): array
    {
        $row = ['kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 300];
        return array_merge([
            'depot_id'    => $this->depot->id,
            'supplier_id' => null,
            'jenis'       => 'SAPI',
            'tgl_masuk'   => '2026-05-01',
            'musim'       => 2026,
            'rows'        => array_fill(0, $count, $row),
        ], $override);
    }

    public function test_store_assigns_no_pengadaan_1_for_first_animal(): void
    {
        $res = $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan', $this->hewanPayload())
            ->assertCreated();

        $this->assertEquals(1, $res->json('hewan.no_pengadaan'));
    }

    public function test_two_sequential_stores_get_different_no_pengadaan(): void
    {
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();
        $r2 = $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();

        $this->assertEquals(2, $r2->json('hewan.no_pengadaan'));
    }

    public function test_bulk_assigns_same_no_pengadaan_to_all_rows(): void
    {
        $res = $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->bulkPayload(3))
            ->assertCreated();

        $numbers = collect($res->json('hewan'))->pluck('no_pengadaan')->unique()->values()->toArray();
        $this->assertCount(1, $numbers);
        $this->assertEquals(1, $numbers[0]);
    }

    public function test_bulk_after_single_store_increments_no_pengadaan(): void
    {
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();

        $res = $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->bulkPayload(2))
            ->assertCreated();

        $this->assertEquals(2, $res->json('hewan.0.no_pengadaan'));
    }

    public function test_store_with_null_kelas_jual_returns_201(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan', $this->hewanPayload(['kelas_jual_id' => null]))
            ->assertCreated()
            ->assertJsonPath('hewan.kelas_jual', null);
    }

    public function test_index_unclassed_filter_returns_only_null_kelas_jual(): void
    {
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload(['kelas_jual_id' => null]))->assertCreated();

        $res = $this->actingAs($this->superAdmin)
            ->getJson("/api/hewan?depot={$this->depot->id}&kelas=UNCLASSED")
            ->assertOk();

        $this->assertEquals(1, $res->json('total'));
        $this->assertNull($res->json('data.0.kelas_jual'));
    }

    public function test_update_assigns_kelas_jual_to_unclassed_animal(): void
    {
        $r  = $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan', $this->hewanPayload(['kelas_jual_id' => null]))
            ->assertCreated();
        $id = $r->json('hewan.id');

        $this->actingAs($this->superAdmin)
            ->putJson("/api/hewan/{$id}", ['kelas_jual_id' => $this->kelas->id])
            ->assertOk()
            ->assertJsonPath('hewan.kelas_jual.id', $this->kelas->id);
    }
}
```

- [ ] **Step 2: Run tests — confirm they FAIL**

```bash
cd backend && php artisan test tests/Feature/Hewan/HewanPengadaanTest.php --no-coverage
```

Expected: failures — `no_pengadaan` field missing from responses, `kelas_jual_id` still required, UNCLASSED filter not handled.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/Feature/Hewan/HewanPengadaanTest.php
git commit -m "test(pengadaan): add failing HewanPengadaanTest (TDD)"
```

---

## Task 4: Backend Implementation — Controller + Requests

**Files:**
- Modify: `backend/app/Http/Controllers/HewanController.php`
- Modify: `backend/app/Http/Requests/StoreHewanRequest.php`
- Modify: `backend/app/Http/Requests/BulkStoreHewanRequest.php`
- Modify: `backend/app/Http/Requests/UpdateHewanRequest.php`

- [ ] **Step 1: Update StoreHewanRequest — kelas_jual_id nullable**

In `backend/app/Http/Requests/StoreHewanRequest.php`, find:
```php
            'kelas_jual_id' => ['required', 'exists:kelas_hewan,id'],
```
Replace with:
```php
            'kelas_jual_id' => ['nullable', 'exists:kelas_hewan,id'],
```

- [ ] **Step 2: Update BulkStoreHewanRequest — kelas_jual_id nullable**

In `backend/app/Http/Requests/BulkStoreHewanRequest.php`, find:
```php
            'rows.*.kelas_jual_id' => ['required', 'exists:kelas_hewan,id'],
```
Replace with:
```php
            'rows.*.kelas_jual_id' => ['nullable', 'exists:kelas_hewan,id'],
```

- [ ] **Step 3: Update UpdateHewanRequest — kelas_jual_id nullable + sometimes**

In `backend/app/Http/Requests/UpdateHewanRequest.php`, find:
```php
            'kelas_jual_id' => ['sometimes', 'exists:kelas_hewan,id'],
```
Replace with:
```php
            'kelas_jual_id' => ['sometimes', 'nullable', 'exists:kelas_hewan,id'],
```

- [ ] **Step 4: Update HewanController::store() — wrap in single transaction**

In `backend/app/Http/Controllers/HewanController.php`, find the `store()` method:
```php
    public function store(StoreHewanRequest $request): JsonResponse
    {
        $data             = $request->validated();
        $data['no_hewan'] = $this->hewanService->generateNoHewan($data['depot_id'], $data['musim'], $data['jenis']);

        $hewan = Hewan::create($data);

        return response()->json(['hewan' => $hewan->load(['kelasAsal', 'kelasJual', 'supplier'])], 201);
    }
```

Replace with:
```php
    public function store(StoreHewanRequest $request): JsonResponse
    {
        $data = $request->validated();

        [$noHewan, $noPengadaan] = DB::transaction(function () use ($data) {
            return [
                $this->hewanService->allocateNoHewan($data['depot_id'], $data['musim'], $data['jenis']),
                $this->hewanService->allocateNoPengadaan($data['depot_id'], $data['musim']),
            ];
        });
        $data['no_hewan']     = $noHewan;
        $data['no_pengadaan'] = $noPengadaan;

        $hewan = Hewan::create($data);

        return response()->json(['hewan' => $hewan->load(['kelasAsal', 'kelasJual', 'supplier'])], 201);
    }
```

- [ ] **Step 5: Update HewanController::storeBulk() — add no_pengadaan allocation**

In `backend/app/Http/Controllers/HewanController.php`, find the `storeBulk()` method:
```php
    public function storeBulk(BulkStoreHewanRequest $request): JsonResponse
    {
        $data   = $request->validated();
        $shared = Arr::except($data, ['rows']);

        $created = DB::transaction(function () use ($shared, $data) {
            return collect($data['rows'])->map(function ($row) use ($shared) {
                $row             = array_merge($shared, $row);
                $row['no_hewan'] = $this->hewanService->allocateNoHewan(
                    $shared['depot_id'], $shared['musim'], $shared['jenis']
                );
                return Hewan::create($row);
            });
        });

        return response()->json(['hewan' => $created, 'count' => $created->count()], 201);
    }
```

Replace with:
```php
    public function storeBulk(BulkStoreHewanRequest $request): JsonResponse
    {
        $data   = $request->validated();
        $shared = Arr::except($data, ['rows']);

        $created = DB::transaction(function () use ($shared, $data) {
            $noPengadaan = $this->hewanService->allocateNoPengadaan($shared['depot_id'], $shared['musim']);
            return collect($data['rows'])->map(function ($row) use ($shared, $noPengadaan) {
                $row                 = array_merge($shared, $row);
                $row['no_hewan']     = $this->hewanService->allocateNoHewan($shared['depot_id'], $shared['musim'], $shared['jenis']);
                $row['no_pengadaan'] = $noPengadaan;
                return Hewan::create($row);
            });
        });

        return response()->json(['hewan' => $created, 'count' => $created->count()], 201);
    }
```

- [ ] **Step 6: Update HewanController::index() — handle UNCLASSED filter**

In `backend/app/Http/Controllers/HewanController.php`, find in `index()`:
```php
            ->when($request->kelas,  fn($q) => $q->where('kelas_jual_id', $request->kelas))
```
Replace with:
```php
            ->when($request->kelas,  fn($q) => $request->kelas === 'UNCLASSED'
                ? $q->whereNull('kelas_jual_id')
                : $q->where('kelas_jual_id', $request->kelas))
```

- [ ] **Step 7: Run HewanPengadaanTest — all 7 must PASS**

```bash
cd backend && php artisan test tests/Feature/Hewan/HewanPengadaanTest.php --no-coverage
```

Expected:
```
PASS  Tests\Feature\Hewan\HewanPengadaanTest
✓ store assigns no pengadaan 1 for first animal
✓ two sequential stores get different no pengadaan
✓ bulk assigns same no pengadaan to all rows
✓ bulk after single store increments no pengadaan
✓ store with null kelas jual returns 201
✓ index unclassed filter returns only null kelas jual
✓ update assigns kelas jual to unclassed animal

Tests: 7 passed
```

- [ ] **Step 8: Run full test suite — no regressions**

```bash
cd backend && php artisan test --no-coverage
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/app/Http/Controllers/HewanController.php \
        backend/app/Http/Requests/StoreHewanRequest.php \
        backend/app/Http/Requests/BulkStoreHewanRequest.php \
        backend/app/Http/Requests/UpdateHewanRequest.php
git commit -m "feat(pengadaan): assign no_pengadaan per batch; nullable kelas_jual; UNCLASSED filter"
```

---

## Task 5: Frontend — page.tsx (table + filter)

**Files:**
- Modify: `frontend/app/(dashboard)/depot/pengadaan/page.tsx`

- [ ] **Step 1: Update Hewan interface — add no_pengadaan**

Find:
```tsx
interface Hewan {
  id: number; no_hewan: string; jenis: string; status: string
  bobot_masuk: string; tgl_masuk: string
  kelas_asal: { kode: string } | null
  kelas_jual: { kode: string } | null
  supplier: { nama: string } | null
}
```

Replace with:
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

- [ ] **Step 2: Add kelas filter state + fetch**

After the existing state declarations (after `showSupplier` line), add:
```tsx
  const [kelasFilter, setKelas]   = useState('')
  const [kelasList, setKelasList] = useState<{ id: number; kode: string }[]>([])
```

Add a new `useEffect` for kelas list (after the existing one):
```tsx
  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelasList(r.data.data ?? []))
  }, [])
```

- [ ] **Step 3: Add kelasFilter to loadHewan**

In `loadHewan()`, after `if (jenisFilter) p.set('jenis', jenisFilter)`, add:
```tsx
    if (kelasFilter) p.set('kelas', kelasFilter)
```

- [ ] **Step 4: Add kelasFilter to useEffect deps**

Find:
```tsx
  useEffect(() => { loadHewan() }, [statusFilter, jenisFilter])
```
Replace with:
```tsx
  useEffect(() => { loadHewan() }, [statusFilter, jenisFilter, kelasFilter])
```

- [ ] **Step 5: Add kelas filter dropdown to filter bar**

Find the filter bar block:
```tsx
      <div className="flex gap-3 my-4 flex-wrap">
        <select value={statusFilter} onChange={e => setStatus(e.target.value as StatusFilter)} className="input-field w-40">
```

Add the kelas dropdown after the existing jenis select (at the end of the `<div className="flex gap-3 my-4 flex-wrap">`):
```tsx
        <select value={kelasFilter} onChange={e => setKelas(e.target.value)} className="input-field w-44">
          <option value="">Semua Kelas</option>
          <option value="UNCLASSED">Belum Dikelas</option>
          {kelasList.map(k => <option key={k.id} value={String(k.id)}>{k.kode}</option>)}
        </select>
```

- [ ] **Step 6: Update table headers — add Pengadaan and Kelas Beli**

Find:
```tsx
                {['No','Jenis','Kelas Jual','Bobot','Tgl Masuk','Supplier','Status',''].map(h => (
```
Replace with:
```tsx
                {['No','Pengadaan','Jenis','Kelas Beli','Kelas Jual','Bobot','Tgl Masuk','Supplier','Status',''].map(h => (
```

- [ ] **Step 7: Update table row cells — add Pengadaan, Kelas Beli, update Kelas Jual**

Find the existing row cells block:
```tsx
                  <td className="py-2.5 pr-3 font-display font-bold text-primary">{h.no_hewan}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.jenis}</td>
                  <td className="py-2.5 pr-3 font-body font-medium">{h.kelas_jual?.kode ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.bobot_masuk} kg</td>
```

Replace with:
```tsx
                  <td className="py-2.5 pr-3 font-display font-bold text-primary">{h.no_hewan}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.no_pengadaan > 0 ? `ke-${h.no_pengadaan}` : '—'}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.jenis}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.kelas_asal?.kode ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    {h.kelas_jual
                      ? <span className="font-body font-medium">{h.kelas_jual.kode}</span>
                      : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-body">Belum Dikelas</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.bobot_masuk} kg</td>
```

- [ ] **Step 8: Update colSpan for empty state row**

Find:
```tsx
                <tr><td colSpan={8} className="py-8 text-center text-on-surface-variant">Belum ada hewan.</td></tr>
```
Replace with:
```tsx
                <tr><td colSpan={10} className="py-8 text-center text-on-surface-variant">Belum ada hewan.</td></tr>
```

- [ ] **Step 9: Commit**

```bash
git add "frontend/app/(dashboard)/depot/pengadaan/page.tsx"
git commit -m "feat(pengadaan): add Pengadaan+Kelas Beli columns, Belum Dikelas chip, kelas filter"
```

---

## Task 6: Frontend — Modals (kelas_jual optional)

**Files:**
- Modify: `frontend/app/(dashboard)/depot/pengadaan/TambahHewanModal.tsx`
- Modify: `frontend/app/(dashboard)/depot/pengadaan/BulkTambahHewanModal.tsx`

- [ ] **Step 1: TambahHewanModal — make kelas_jual optional**

In `frontend/app/(dashboard)/depot/pengadaan/TambahHewanModal.tsx`, find the kelas_jual select:
```tsx
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Kelas Jual</label>
              <select value={form.kelas_jual_id} onChange={e => set('kelas_jual_id', e.target.value)} className="input-field mt-1.5" required>
                <option value="">Pilih kelas...</option>
                {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
              </select>
```

Replace with:
```tsx
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Kelas Jual</label>
              <select value={form.kelas_jual_id} onChange={e => set('kelas_jual_id', e.target.value)} className="input-field mt-1.5">
                <option value="">Pilih nanti...</option>
                {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
              </select>
```

- [ ] **Step 2: TambahHewanModal — fix handleSubmit to send null when empty**

In `handleSubmit`, find:
```tsx
        kelas_jual_id: Number(form.kelas_jual_id),
```
Replace with:
```tsx
        kelas_jual_id: form.kelas_jual_id ? Number(form.kelas_jual_id) : null,
```

- [ ] **Step 3: BulkTambahHewanModal — make kelas_jual optional per row**

In `frontend/app/(dashboard)/depot/pengadaan/BulkTambahHewanModal.tsx`, find the kelas_jual select in the table rows:
```tsx
                      <select value={row.kelas_jual_id} onChange={e => updateRow(i, 'kelas_jual_id', e.target.value)} className="input-field" required>
                        <option value="">Pilih...</option>
                        {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
                      </select>
```

Replace with:
```tsx
                      <select value={row.kelas_jual_id} onChange={e => updateRow(i, 'kelas_jual_id', e.target.value)} className="input-field">
                        <option value="">Pilih nanti...</option>
                        {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
                      </select>
```

- [ ] **Step 4: BulkTambahHewanModal — fix handleSubmit to send null when empty**

In `handleSubmit` inside `rows.map(r => ...)`, find:
```tsx
          kelas_jual_id: Number(r.kelas_jual_id),
```
Replace with:
```tsx
          kelas_jual_id: r.kelas_jual_id ? Number(r.kelas_jual_id) : null,
```

- [ ] **Step 5: Commit**

```bash
git add "frontend/app/(dashboard)/depot/pengadaan/TambahHewanModal.tsx" \
        "frontend/app/(dashboard)/depot/pengadaan/BulkTambahHewanModal.tsx"
git commit -m "feat(pengadaan): make kelas_jual optional in single + bulk add modals"
```

---

## Task 7: Smoke Test

- [ ] **Step 1: Start dev server if not running**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Smoke test — single animal without kelas_jual**

1. Go to `/depot/pengadaan`
2. Click **+ Tambah 1 Ekor**
3. Fill all fields — leave Kelas Jual as "Pilih nanti..."
4. Save → animal appears in list with amber "Belum Dikelas" chip in Kelas Jual column
5. Check Pengadaan column shows "ke-1"

- [ ] **Step 3: Smoke test — bulk add**

1. Click **+ Tambah Massal**
2. Add 2 rows, leave kelas_jual empty on one row, fill on the other
3. Save → both animals appear, same no_pengadaan (ke-2), correct Belum Dikelas chips

- [ ] **Step 4: Smoke test — filter Belum Dikelas**

1. In filter bar, select "Belum Dikelas" from kelas dropdown
2. Only animals without kelas_jual should show

- [ ] **Step 5: Smoke test — CS assigns kelas via edit**

1. Click Detail on a "Belum Dikelas" animal
2. Edit → assign kelas_jual
3. Save → chip disappears, kelas_jual shows

- [ ] **Step 6: Commit fixes if any**

Only run if smoke test exposed bugs:
```bash
git add -p
git commit -m "fix(pengadaan): smoke test fixes"
```
