# T-11 Setoran GUM (Konsinyasi Supplier) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Setoran GUM module — manual setoran input (partial allowed), dashboard posisi hutang (total pengadaan GUM − total disetor = sisa hutang), riwayat table.

**Architecture:** New `setoran_gum` table records every cash transfer to GUM supplier. `SetoranGumController` computes `total_pengadaan` by joining `hewan → harga_kelas` for all hewan sourced from GUM suppliers (`is_gum=true`). Frontend `/keuangan/setoran-gum` page mirrors the `/keuangan` page pattern: 3 posisi cards, riwayat table, tambah modal. Sidebar adds link after existing `/keuangan` entry.

**Tech Stack:** Laravel 11 (Eloquent, DB query builder, RefreshDatabase tests), Next.js 14 App Router (Client Component), TypeScript, PHPUnit TDD

---

## File Map

### Backend — Create
```
backend/
  database/migrations/2026_04_24_000000_create_setoran_gum_table.php
  app/Models/SetoranGum.php
  app/Http/Controllers/SetoranGumController.php
  tests/Feature/Keuangan/SetoranGumTest.php
```

### Backend — Modify
```
backend/routes/api.php  (add setoran-gum routes inside keuangan middleware group)
```

### Frontend — Create
```
frontend/app/(dashboard)/keuangan/setoran-gum/
  page.tsx
  components/
    PosisiCards.tsx
    SetoranTable.tsx
    TambahSetoranModal.tsx
```

### Frontend — Modify
```
frontend/components/shared/Sidebar.tsx  (add /keuangan/setoran-gum nav item)
```

---

## Task 1: Migration + Model

**Files:**
- Create: `backend/database/migrations/2026_04_24_000000_create_setoran_gum_table.php`
- Create: `backend/app/Models/SetoranGum.php`

- [ ] **Step 1: Create migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('setoran_gum', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('supplier')->nullOnDelete();
            $table->date('tgl_setor');
            $table->unsignedBigInteger('jumlah');
            $table->enum('metode', ['CASH', 'TRANSFER_BCA', 'TRANSFER_LAIN'])->default('CASH');
            $table->string('keterangan', 300)->nullable();
            $table->foreignId('input_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('setoran_gum');
    }
};
```

Save to `backend/database/migrations/2026_04_24_000000_create_setoran_gum_table.php`.

- [ ] **Step 2: Create model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SetoranGum extends Model
{
    protected $table = 'setoran_gum';

    protected $fillable = [
        'depot_id', 'supplier_id', 'tgl_setor',
        'jumlah', 'metode', 'keterangan', 'input_by',
    ];

    protected $casts = [
        'tgl_setor' => 'date',
        'jumlah'    => 'integer',
    ];

    public function depot(): BelongsTo    { return $this->belongsTo(Depot::class); }
    public function supplier(): BelongsTo { return $this->belongsTo(Supplier::class); }
    public function inputBy(): BelongsTo  { return $this->belongsTo(User::class, 'input_by'); }
}
```

Save to `backend/app/Models/SetoranGum.php`.

- [ ] **Step 3: Run migration**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan migrate
```

Expected: `Migrating: 2026_04_24_000000_create_setoran_gum_table` then `Migrated`.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/2026_04_24_000000_create_setoran_gum_table.php backend/app/Models/SetoranGum.php
git commit -m "feat(setoran-gum): add setoran_gum migration and SetoranGum model"
```

---

## Task 2: Write Failing Tests

**Files:**
- Create: `backend/tests/Feature/Keuangan/SetoranGumTest.php`

- [ ] **Step 1: Write the test file**

```php
<?php
namespace Tests\Feature\Keuangan;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\HargaKelas;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\SetoranGum;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SetoranGumTest extends TestCase
{
    use RefreshDatabase;

    private User $kepala;
    private Depot $depot;
    private Supplier $gum;
    private KelasHewan $kelas;
    private int $musim = 2026;
    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->depot  = Depot::factory()->create();
        $this->kepala = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);
        $this->gum = Supplier::create([
            'nama'      => 'GUM Pusat',
            'is_gum'    => true,
            'is_active' => true,
        ]);
        $this->kelas = KelasHewan::create([
            'kode'    => 'A1',
            'nama'    => 'Kelas A',
            'urutan'  => 1,
        ]);
    }

    /** Create a hewan from GUM with harga_beli linked via harga_kelas */
    private function makeHewan(int $hargaBeli): Hewan
    {
        $this->seq++;

        HargaKelas::firstOrCreate(
            [
                'depot_id' => $this->depot->id,
                'kelas_id' => $this->kelas->id,
                'jenis'    => 'SAPI',
                'musim'    => $this->musim,
            ],
            ['harga_beli' => $hargaBeli, 'harga_jual' => $hargaBeli + 1_000_000]
        );

        return Hewan::create([
            'depot_id'      => $this->depot->id,
            'supplier_id'   => $this->gum->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'no_hewan'      => str_pad($this->seq, 3, '0', STR_PAD_LEFT),
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300.00,
            'tgl_masuk'     => today()->toDateString(),
            'musim'         => $this->musim,
            'status'        => 'AVAILABLE',
        ]);
    }

    private function makeSetoran(array $attrs = []): SetoranGum
    {
        return SetoranGum::create(array_merge([
            'depot_id'    => $this->depot->id,
            'supplier_id' => $this->gum->id,
            'tgl_setor'   => today()->toDateString(),
            'jumlah'      => 5_000_000,
            'metode'      => 'CASH',
            'keterangan'  => 'Setoran rutin',
            'input_by'    => $this->kepala->id,
        ], $attrs));
    }

    // ─── index ───────────────────────────────────────────────────────────────

    public function test_kepala_can_list_setoran(): void
    {
        $this->makeSetoran(['jumlah' => 3_000_000]);
        $this->makeSetoran(['jumlah' => 2_000_000]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/setoran-gum');

        $res->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'tgl_setor', 'jumlah', 'metode', 'keterangan']],
                'total', 'per_page', 'current_page',
            ]);

        $this->assertCount(2, $res->json('data'));
    }

    public function test_index_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        $this->makeSetoran();
        SetoranGum::create([
            'depot_id'   => $otherDepot->id,
            'tgl_setor'  => today()->toDateString(),
            'jumlah'     => 9_000_000,
            'metode'     => 'CASH',
        ]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/setoran-gum');

        $this->assertCount(1, $res->json('data'));
    }

    public function test_index_filterable_by_date_range(): void
    {
        $this->makeSetoran(['tgl_setor' => '2026-04-01']);
        $this->makeSetoran(['tgl_setor' => '2026-04-15']);
        $this->makeSetoran(['tgl_setor' => '2026-04-30']);

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/keuangan/setoran-gum?tgl_dari=2026-04-10&tgl_sampai=2026-04-20');

        $this->assertCount(1, $res->json('data'));
    }

    // ─── store ───────────────────────────────────────────────────────────────

    public function test_kepala_can_create_setoran(): void
    {
        $res = $this->actingAs($this->kepala)->postJson('/api/keuangan/setoran-gum', [
            'tgl_setor'  => today()->toDateString(),
            'jumlah'     => 10_000_000,
            'metode'     => 'TRANSFER_BCA',
            'keterangan' => 'Bayar batch April',
        ]);

        $res->assertCreated()->assertJsonPath('setoran.jumlah', 10_000_000);
        $this->assertDatabaseHas('setoran_gum', ['jumlah' => 10_000_000, 'metode' => 'TRANSFER_BCA']);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/setoran-gum', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tgl_setor', 'jumlah', 'metode']);
    }

    public function test_store_rejects_invalid_metode(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/setoran-gum', [
            'tgl_setor' => today()->toDateString(),
            'jumlah'    => 1_000_000,
            'metode'    => 'GOPAY',
        ])->assertUnprocessable()->assertJsonValidationErrors(['metode']);
    }

    // ─── posisi ──────────────────────────────────────────────────────────────

    public function test_posisi_returns_correct_hutang_breakdown(): void
    {
        // 2 hewan × harga_beli 10_000_000 = total_pengadaan 20_000_000
        $this->makeHewan(10_000_000);
        $this->makeHewan(10_000_000);

        // 12_000_000 disetor
        $this->makeSetoran(['jumlah' => 7_000_000]);
        $this->makeSetoran(['jumlah' => 5_000_000]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/setoran-gum/posisi');

        $res->assertOk()
            ->assertJsonPath('total_pengadaan', 20_000_000)
            ->assertJsonPath('total_setor',     12_000_000)
            ->assertJsonPath('sisa_hutang',      8_000_000);
    }

    public function test_posisi_excludes_non_gum_hewan(): void
    {
        $nonGum = Supplier::create(['nama' => 'Supplier Lain', 'is_gum' => false, 'is_active' => true]);

        // 1 hewan from GUM, 1 from non-GUM — only GUM hewan counted in pengadaan
        $this->makeHewan(10_000_000);

        HargaKelas::firstOrCreate(
            ['depot_id' => $this->depot->id, 'kelas_id' => $this->kelas->id, 'jenis' => 'SAPI', 'musim' => $this->musim],
            ['harga_beli' => 10_000_000, 'harga_jual' => 11_000_000]
        );
        $this->seq++;
        Hewan::create([
            'depot_id' => $this->depot->id, 'supplier_id' => $nonGum->id,
            'kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id,
            'no_hewan' => str_pad($this->seq, 3, '0', STR_PAD_LEFT),
            'jenis' => 'SAPI', 'bobot_masuk' => 300.00,
            'tgl_masuk' => today()->toDateString(), 'musim' => $this->musim, 'status' => 'AVAILABLE',
        ]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/setoran-gum/posisi');

        $res->assertOk()->assertJsonPath('total_pengadaan', 10_000_000);
    }

    public function test_posisi_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();

        $this->makeHewan(10_000_000);

        // another depot's hewan — should NOT affect our posisi
        $otherKelas = KelasHewan::create(['kode' => 'B1', 'nama' => 'Kelas B', 'urutan' => 2]);
        HargaKelas::create([
            'depot_id' => $otherDepot->id, 'kelas_id' => $otherKelas->id,
            'jenis' => 'SAPI', 'musim' => $this->musim,
            'harga_beli' => 50_000_000, 'harga_jual' => 55_000_000,
        ]);
        Hewan::create([
            'depot_id' => $otherDepot->id, 'supplier_id' => $this->gum->id,
            'kelas_asal_id' => $otherKelas->id, 'kelas_jual_id' => $otherKelas->id,
            'no_hewan' => '001', 'jenis' => 'SAPI', 'bobot_masuk' => 300.00,
            'tgl_masuk' => today()->toDateString(), 'musim' => $this->musim, 'status' => 'AVAILABLE',
        ]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/setoran-gum/posisi');

        $res->assertOk()->assertJsonPath('total_pengadaan', 10_000_000);
    }

    public function test_posisi_zero_when_no_data(): void
    {
        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/setoran-gum/posisi');

        $res->assertOk()
            ->assertJsonPath('total_pengadaan', 0)
            ->assertJsonPath('total_setor',     0)
            ->assertJsonPath('sisa_hutang',     0);
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/keuangan/setoran-gum')->assertUnauthorized();
        $this->getJson('/api/keuangan/setoran-gum/posisi')->assertUnauthorized();
    }
}
```

Save to `backend/tests/Feature/Keuangan/SetoranGumTest.php`.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Keuangan/SetoranGumTest.php --no-coverage 2>&1 | tail -10
```

Expected: all tests FAIL with 404 (routes not yet registered) or "class not found".

- [ ] **Step 3: Commit failing tests**

```bash
cd /c/Users/USER/projects/simhq
git add backend/tests/Feature/Keuangan/SetoranGumTest.php
git commit -m "test(setoran-gum): add failing SetoranGumTest (TDD)"
```

---

## Task 3: Implement SetoranGumController

**Files:**
- Create: `backend/app/Http/Controllers/SetoranGumController.php`

- [ ] **Step 1: Write controller**

```php
<?php
namespace App\Http\Controllers;

use App\Models\SetoranGum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SetoranGumController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $query = SetoranGum::where('depot_id', $depotId);

        if ($request->tgl_dari)   { $query->where('tgl_setor', '>=', $request->tgl_dari); }
        if ($request->tgl_sampai) { $query->where('tgl_setor', '<=', $request->tgl_sampai); }

        $data = $query->with('inputBy:id,name', 'supplier:id,nama')
            ->orderBy('tgl_setor', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(50);

        return response()->json($data);
    }

    public function store(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin()
            ? ($request->depot_id ?? $user->depot_id)
            : $user->depot_id;

        $data = $request->validate([
            'tgl_setor'   => ['required', 'date'],
            'jumlah'      => ['required', 'integer', 'min:1'],
            'metode'      => ['required', 'in:CASH,TRANSFER_BCA,TRANSFER_LAIN'],
            'keterangan'  => ['nullable', 'string', 'max:300'],
            'supplier_id' => ['nullable', 'exists:supplier,id'],
        ]);

        $setoran = SetoranGum::create(array_merge($data, [
            'depot_id' => $depotId,
            'input_by' => $user->id,
        ]));

        return response()->json(['setoran' => $setoran->load('inputBy:id,name', 'supplier:id,nama')], 201);
    }

    public function posisi(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $totalPengadaan = (int) DB::table('hewan')
            ->join('supplier', 'supplier.id', '=', 'hewan.supplier_id')
            ->join('harga_kelas', function ($join) {
                $join->on('harga_kelas.kelas_id', '=', 'hewan.kelas_asal_id')
                     ->on('harga_kelas.jenis', '=', 'hewan.jenis')
                     ->on('harga_kelas.musim', '=', 'hewan.musim')
                     ->on('harga_kelas.depot_id', '=', 'hewan.depot_id');
            })
            ->where('hewan.depot_id', $depotId)
            ->where('supplier.is_gum', true)
            ->sum('harga_kelas.harga_beli');

        $totalSetor = (int) SetoranGum::where('depot_id', $depotId)->sum('jumlah');

        return response()->json([
            'total_pengadaan' => $totalPengadaan,
            'total_setor'     => $totalSetor,
            'sisa_hutang'     => $totalPengadaan - $totalSetor,
        ]);
    }
}
```

Save to `backend/app/Http/Controllers/SetoranGumController.php`.

- [ ] **Step 2: Register routes in `backend/routes/api.php`**

Inside the existing `keuangan` middleware group (after the kas export route), add:

```php
// Setoran GUM — static 'posisi' route MUST come before resource routes
Route::get('keuangan/setoran-gum/posisi',  [\App\Http\Controllers\SetoranGumController::class, 'posisi']);
Route::get('keuangan/setoran-gum',         [\App\Http\Controllers\SetoranGumController::class, 'index']);
Route::post('keuangan/setoran-gum',        [\App\Http\Controllers\SetoranGumController::class, 'store']);
```

The full updated keuangan block in `routes/api.php`:

```php
// Keuangan BIOP
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_KETUA')->group(function () {
    Route::get('keuangan/kas/export',        [\App\Http\Controllers\KasController::class,       'export']);
    Route::get('keuangan/kas',               [\App\Http\Controllers\KasController::class,       'index']);
    Route::post('keuangan/kas',              [\App\Http\Controllers\KasController::class,       'store']);
    Route::get('keuangan/saldo',             [\App\Http\Controllers\KasController::class,       'saldo']);
    Route::get('keuangan/cashflow',          [\App\Http\Controllers\KasController::class,       'cashflow']);
    // Setoran GUM — posisi MUST be before the GET collection route
    Route::get('keuangan/setoran-gum/posisi', [\App\Http\Controllers\SetoranGumController::class, 'posisi']);
    Route::get('keuangan/setoran-gum',        [\App\Http\Controllers\SetoranGumController::class, 'index']);
    Route::post('keuangan/setoran-gum',       [\App\Http\Controllers\SetoranGumController::class, 'store']);
});
```

- [ ] **Step 3: Run tests — expect green**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Keuangan/SetoranGumTest.php --no-coverage 2>&1 | tail -15
```

Expected: all tests PASS. If any fail, read the failure message and fix accordingly before continuing.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/SetoranGumController.php backend/routes/api.php
git commit -m "feat(setoran-gum): add SetoranGumController + routes (index, store, posisi)"
```

---

## Task 4: Frontend — PosisiCards Component

**Files:**
- Create: `frontend/app/(dashboard)/keuangan/setoran-gum/components/PosisiCards.tsx`

- [ ] **Step 1: Write PosisiCards component**

```tsx
import { Card } from '@/components/ui/Card'

interface Posisi {
  total_pengadaan: number
  total_setor: number
  sisa_hutang: number
}

interface PosisiCardsProps {
  posisi: Posisi
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

export function PosisiCards({ posisi }: PosisiCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Total Pengadaan GUM
        </p>
        <p className="font-display font-bold text-2xl text-on-surface">
          {rupiah(posisi.total_pengadaan)}
        </p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Total Disetor
        </p>
        <p className="font-display font-bold text-2xl text-[#15803d]">
          {rupiah(posisi.total_setor)}
        </p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Sisa Hutang
        </p>
        <p className={`font-display font-bold text-2xl ${
          posisi.sisa_hutang > 0 ? 'text-error' : 'text-[#15803d]'
        }`}>
          {rupiah(posisi.sisa_hutang)}
        </p>
        {posisi.sisa_hutang > 0 && (
          <p className="text-xs text-on-surface-variant mt-1">Belum lunas</p>
        )}
        {posisi.sisa_hutang <= 0 && posisi.total_pengadaan > 0 && (
          <p className="text-xs text-[#15803d] mt-1">Lunas</p>
        )}
      </Card>
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/keuangan/setoran-gum/components/PosisiCards.tsx`.

- [ ] **Step 2: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/app/\(dashboard\)/keuangan/setoran-gum/components/PosisiCards.tsx
git commit -m "feat(setoran-gum): add PosisiCards component"
```

---

## Task 5: Frontend — SetoranTable Component

**Files:**
- Create: `frontend/app/(dashboard)/keuangan/setoran-gum/components/SetoranTable.tsx`

- [ ] **Step 1: Write SetoranTable component**

```tsx
import { Card } from '@/components/ui/Card'

interface SetoranEntry {
  id: number
  tgl_setor: string
  jumlah: number
  metode: string
  keterangan: string | null
  supplier: { id: number; nama: string } | null
  input_by: { id: number; name: string } | null
}

interface SetoranTableProps {
  entries: SetoranEntry[]
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

const METODE_LABEL: Record<string, string> = {
  CASH:          'Tunai',
  TRANSFER_BCA:  'Transfer BCA',
  TRANSFER_LAIN: 'Transfer Lain',
}

export function SetoranTable({ entries }: SetoranTableProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant text-center py-8">
          Belum ada riwayat setoran.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-high">
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Tanggal</th>
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Supplier</th>
              <th className="text-right py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Jumlah</th>
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Metode</th>
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Keterangan</th>
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Input By</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                <td className="py-3 px-4 font-body text-on-surface whitespace-nowrap">{e.tgl_setor}</td>
                <td className="py-3 px-4 font-body text-on-surface-variant">{e.supplier?.nama ?? 'GUM'}</td>
                <td className="py-3 px-4 font-display font-semibold text-[#15803d] text-right whitespace-nowrap">
                  {rupiah(e.jumlah)}
                </td>
                <td className="py-3 px-4 font-body text-on-surface-variant">{METODE_LABEL[e.metode] ?? e.metode}</td>
                <td className="py-3 px-4 font-body text-on-surface-variant">{e.keterangan ?? '—'}</td>
                <td className="py-3 px-4 font-body text-on-surface-variant">{e.input_by?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
```

Save to `frontend/app/(dashboard)/keuangan/setoran-gum/components/SetoranTable.tsx`.

- [ ] **Step 2: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/app/\(dashboard\)/keuangan/setoran-gum/components/SetoranTable.tsx
git commit -m "feat(setoran-gum): add SetoranTable component"
```

---

## Task 6: Frontend — TambahSetoranModal Component

**Files:**
- Create: `frontend/app/(dashboard)/keuangan/setoran-gum/components/TambahSetoranModal.tsx`

- [ ] **Step 1: Write TambahSetoranModal component**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

const METODE_OPTIONS = [
  { value: 'CASH',          label: 'Tunai' },
  { value: 'TRANSFER_BCA',  label: 'Transfer BCA' },
  { value: 'TRANSFER_LAIN', label: 'Transfer Lain' },
]

interface TambahSetoranModalProps {
  onDone:  () => void
  onClose: () => void
}

export function TambahSetoranModal({ onDone, onClose }: TambahSetoranModalProps) {
  const [form, setForm] = useState({
    tgl_setor:  new Date().toISOString().slice(0, 10),
    jumlah:     '',
    metode:     'TRANSFER_BCA',
    keterangan: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit() {
    if (!form.tgl_setor || !form.jumlah) {
      setError('Tanggal dan jumlah wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/keuangan/setoran-gum', {
        tgl_setor:  form.tgl_setor,
        jumlah:     Number(form.jumlah),
        metode:     form.metode,
        keterangan: form.keterangan || undefined,
      })
      onDone()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  const labelClass = 'text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-1 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-card w-full max-w-md p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-on-surface">Tambah Setoran GUM</h2>

        <Input
          label="Tanggal Setor"
          type="date"
          value={form.tgl_setor}
          onChange={(e) => set('tgl_setor', e.target.value)}
        />

        <Input
          label="Jumlah (Rp)"
          type="number"
          min="1"
          value={form.jumlah}
          onChange={(e) => set('jumlah', e.target.value)}
          placeholder="10000000"
        />

        <div>
          <label className={labelClass}>Metode</label>
          <select value={form.metode} onChange={(e) => set('metode', e.target.value)} className="input-field">
            {METODE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <Input
          label="Keterangan (opsional)"
          value={form.keterangan}
          onChange={(e) => set('keterangan', e.target.value)}
          placeholder="Mis. Setoran batch April minggu 1"
        />

        {error && (
          <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={submit} loading={saving} className="flex-1">Simpan</Button>
        </div>
      </div>
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/keuangan/setoran-gum/components/TambahSetoranModal.tsx`.

- [ ] **Step 2: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/app/\(dashboard\)/keuangan/setoran-gum/components/TambahSetoranModal.tsx
git commit -m "feat(setoran-gum): add TambahSetoranModal component"
```

---

## Task 7: Frontend — Page + Sidebar

**Files:**
- Create: `frontend/app/(dashboard)/keuangan/setoran-gum/page.tsx`
- Modify: `frontend/components/shared/Sidebar.tsx`

- [ ] **Step 1: Write page.tsx**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PosisiCards }        from './components/PosisiCards'
import { SetoranTable }       from './components/SetoranTable'
import { TambahSetoranModal } from './components/TambahSetoranModal'
import api from '@/lib/api'

interface SetoranEntry {
  id: number
  tgl_setor: string
  jumlah: number
  metode: string
  keterangan: string | null
  supplier: { id: number; nama: string } | null
  input_by: { id: number; name: string } | null
}

interface Posisi {
  total_pengadaan: number
  total_setor: number
  sisa_hutang: number
}

export default function SetoranGumPage() {
  const [entries,    setEntries]    = useState<SetoranEntry[]>([])
  const [posisi,     setPosisi]     = useState<Posisi>({ total_pengadaan: 0, total_setor: 0, sisa_hutang: 0 })
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [showModal,  setShowModal]  = useState(false)

  const [tglDari,   setTglDari]   = useState('')
  const [tglSampai, setTglSampai] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (tglDari)   params.set('tgl_dari',   tglDari)
      if (tglSampai) params.set('tgl_sampai', tglSampai)

      const [listRes, posisiRes] = await Promise.all([
        api.get(`/api/keuangan/setoran-gum?${params}`),
        api.get('/api/keuangan/setoran-gum/posisi'),
      ])

      setEntries(listRes.data.data ?? [])
      setPosisi(posisiRes.data)
    } catch {
      setError('Gagal memuat data setoran GUM.')
    } finally {
      setLoading(false)
    }
  }, [tglDari, tglSampai])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Setoran GUM</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manajemen hutang konsinyasi ke supplier GUM</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          Tambah Setoran
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-surface rounded-lg">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Dari</label>
          <input type="date" value={tglDari} onChange={(e) => setTglDari(e.target.value)} className="input-field text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Sampai</label>
          <input type="date" value={tglSampai} onChange={(e) => setTglSampai(e.target.value)} className="input-field text-sm" />
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          <PosisiCards posisi={posisi} />
          <div>
            <h2 className="font-display font-semibold text-base text-on-surface mb-3">Riwayat Setoran</h2>
            <SetoranTable entries={entries} />
          </div>
        </div>
      )}

      {showModal && (
        <TambahSetoranModal
          onDone={() => { setShowModal(false); fetchData() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/keuangan/setoran-gum/page.tsx`.

- [ ] **Step 2: Add sidebar link**

In `frontend/components/shared/Sidebar.tsx`, add import for `HandCoins`:

```tsx
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  Wallet, Truck, ClipboardList, ClipboardCheck, LogOut, Database, PawPrint, Grid3x3, Receipt, Layers, BarChart2, HandCoins
} from 'lucide-react'
```

Then add the Setoran GUM nav item AFTER the `/keuangan` entry (line 29):

```tsx
  { href: '/keuangan',           label: 'Keuangan',      icon: Wallet,     roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
  { href: '/keuangan/setoran-gum', label: 'Setoran GUM', icon: HandCoins,  roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
```

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. Fix any type errors before continuing.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/app/\(dashboard\)/keuangan/setoran-gum/ frontend/components/shared/Sidebar.tsx
git commit -m "feat(setoran-gum): wire T-11 setoran GUM page + sidebar link"
```

---

## Task 8: Verification + Close T-11

**Files:**
- Modify: `backend/tests/Feature/Keuangan/SetoranGumTest.php` (no changes — just run)
- Modify: `docs/tasks/T-11-setoran-gum.md`
- Modify: `docs/TASKS.md`

- [ ] **Step 1: Run all backend tests**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Keuangan/SetoranGumTest.php --no-coverage 2>&1 | tail -15
```

Expected: all tests PASS.

- [ ] **Step 2: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -5
```

Expected: no output.

- [ ] **Step 3: Smoke test checklist**

With backend on :8000 and frontend on :3000:

- [ ] `/keuangan/setoran-gum` loads without errors (KEPALA_DEPOT role)
- [ ] Posisi cards show (zeros OK if no data)
- [ ] Filter by date range re-fetches list
- [ ] "Tambah Setoran" modal opens and closes
- [ ] Submit a setoran — appears in table, posisi updates
- [ ] Sidebar shows "Setoran GUM" link
- [ ] "Keuangan" sidebar item links to `/keuangan`, "Setoran GUM" to `/keuangan/setoran-gum`

- [ ] **Step 4: Update T-11 task doc**

In `docs/tasks/T-11-setoran-gum.md`:
- Change `**Status:** \`TODO\`` → `**Status:** \`DONE\``
- Change all `- [ ]` in Acceptance Criteria and Technical Tasks to `- [x]`

- [ ] **Step 5: Update TASKS.md**

- T-11 row: `⬜ TODO` → `✅ DONE`
- Phase 2 progress: `2 / 10` → `3 / 10`
- Summary table: Phase 2 Selesai `2→3`, Sisa `8→7`; TOTAL Selesai `10→11`, Sisa `15→14`

- [ ] **Step 6: Commit + tag**

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-11-setoran-gum.md docs/TASKS.md
git commit -m "docs: mark T-11 Setoran GUM as DONE"
git tag t-11-complete
```

---

## Acceptance Criteria Checklist

- [ ] Input setoran ke GUM: tanggal, jumlah, metode (cash/BCA), keterangan
- [ ] Setoran bisa partial (tidak harus sesuai 1:1 dengan pengadaan)
- [ ] Dashboard: total harga pengadaan dari GUM, total disetor, sisa hutang
- [ ] Riwayat setoran per batch
- [ ] Posisi hutang terlihat jelas tanpa hitung manual
- [ ] All backend tests pass
- [ ] Frontend `/keuangan/setoran-gum` accessible to KEPALA_DEPOT/ADMIN_KETUA
- [ ] PosisiCards show correct totals
- [ ] SetoranTable shows riwayat with metode + keterangan
- [ ] TambahSetoranModal saves and refreshes
