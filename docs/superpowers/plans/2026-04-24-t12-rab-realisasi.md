# T-12 RAB per Divisi & Realisasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build RAB (budget) management per division — set annual budget, record actual spending (realisasi), auto-compute selisih, color-code progress bars, and auto-mirror realisasi into kas_harian KELUAR.

**Architecture:** Two new tables: `rab` (one budget entry per divisi+musim+depot) and `realisasi_pengeluaran` (many spending records per RAB). `RabController` exposes summary, upsert RAB, list/add realisasi. Adding a realisasi entry also auto-creates a `kas_harian` KELUAR row inside a DB transaction (same pattern as `PembayaranController`). Frontend `/keuangan/rab` page shows a summary table with inline progress bars and two modals. WA notification criterion (T-17 dependency) is deferred until T-17 is implemented.

**Tech Stack:** Laravel 11 (Eloquent, DB transaction, RefreshDatabase), Next.js 14 App Router (Client Component), TypeScript, PHPUnit TDD

---

## File Map

### Backend — Create
```
backend/
  database/migrations/2026_04_24_100000_create_rab_table.php
  database/migrations/2026_04_24_100001_create_realisasi_pengeluaran_table.php
  app/Models/Rab.php
  app/Models/RealisasiPengeluaran.php
  app/Http/Controllers/RabController.php
  tests/Feature/Keuangan/RabTest.php
```

### Backend — Modify
```
backend/routes/api.php  (add RAB routes inside keuangan middleware group)
```

### Frontend — Create
```
frontend/app/(dashboard)/keuangan/rab/
  page.tsx
  components/
    RabSummaryTable.tsx
    SetRabModal.tsx
    TambahRealisasiModal.tsx
```

### Frontend — Modify
```
frontend/components/shared/Sidebar.tsx  (add BookOpen import + /keuangan/rab nav item)
```

---

## Task 1: Migrations + Models

**Files:**
- Create: `backend/database/migrations/2026_04_24_100000_create_rab_table.php`
- Create: `backend/database/migrations/2026_04_24_100001_create_realisasi_pengeluaran_table.php`
- Create: `backend/app/Models/Rab.php`
- Create: `backend/app/Models/RealisasiPengeluaran.php`

- [ ] **Step 1: Create rab migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rab', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->string('divisi', 30);
            $table->year('musim');
            $table->unsignedInteger('jumlah_anggaran')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['depot_id', 'divisi', 'musim'], 'rab_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rab');
    }
};
```

Save to `backend/database/migrations/2026_04_24_100000_create_rab_table.php`.

- [ ] **Step 2: Create realisasi_pengeluaran migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('realisasi_pengeluaran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rab_id')->constrained('rab')->cascadeOnDelete();
            $table->string('keterangan', 300);
            $table->unsignedInteger('jumlah');
            $table->date('tgl_pengeluaran');
            $table->foreignId('input_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('realisasi_pengeluaran');
    }
};
```

Save to `backend/database/migrations/2026_04_24_100001_create_realisasi_pengeluaran_table.php`.

- [ ] **Step 3: Create Rab model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rab extends Model
{
    protected $table = 'rab';

    protected $fillable = [
        'depot_id', 'divisi', 'musim', 'jumlah_anggaran', 'created_by',
    ];

    protected $casts = [
        'jumlah_anggaran' => 'integer',
        'musim'           => 'integer',
    ];

    public function depot(): BelongsTo      { return $this->belongsTo(Depot::class); }
    public function createdBy(): BelongsTo  { return $this->belongsTo(User::class, 'created_by'); }
    public function realisasi(): HasMany    { return $this->hasMany(RealisasiPengeluaran::class); }
}
```

Save to `backend/app/Models/Rab.php`.

- [ ] **Step 4: Create RealisasiPengeluaran model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RealisasiPengeluaran extends Model
{
    protected $table = 'realisasi_pengeluaran';

    protected $fillable = [
        'rab_id', 'keterangan', 'jumlah', 'tgl_pengeluaran', 'input_by',
    ];

    protected $casts = [
        'jumlah'          => 'integer',
        'tgl_pengeluaran' => 'date',
    ];

    public function rab(): BelongsTo     { return $this->belongsTo(Rab::class); }
    public function inputBy(): BelongsTo { return $this->belongsTo(User::class, 'input_by'); }
}
```

Save to `backend/app/Models/RealisasiPengeluaran.php`.

- [ ] **Step 5: Run migrations**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan migrate
```

Expected output includes:
```
Migrating: 2026_04_24_100000_create_rab_table
Migrated:  2026_04_24_100000_create_rab_table
Migrating: 2026_04_24_100001_create_realisasi_pengeluaran_table
Migrated:  2026_04_24_100001_create_realisasi_pengeluaran_table
```

- [ ] **Step 6: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/2026_04_24_100000_create_rab_table.php \
        backend/database/migrations/2026_04_24_100001_create_realisasi_pengeluaran_table.php \
        backend/app/Models/Rab.php \
        backend/app/Models/RealisasiPengeluaran.php
git commit -m "feat(rab): add rab + realisasi_pengeluaran migrations and models"
```

---

## Task 2: Write Failing Tests

**Files:**
- Create: `backend/tests/Feature/Keuangan/RabTest.php`

- [ ] **Step 1: Write test file**

```php
<?php

namespace Tests\Feature\Keuangan;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\KasHarian;
use App\Models\Rab;
use App\Models\RealisasiPengeluaran;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RabTest extends TestCase
{
    use RefreshDatabase;

    private User  $kepala;
    private Depot $depot;
    private int   $musim = 2026;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot  = Depot::factory()->create();
        $this->kepala = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);
    }

    private function makeRab(string $divisi = 'LOGISTIK', int $anggaran = 10_000_000): Rab
    {
        return Rab::create([
            'depot_id'        => $this->depot->id,
            'divisi'          => $divisi,
            'musim'           => $this->musim,
            'jumlah_anggaran' => $anggaran,
            'created_by'      => $this->kepala->id,
        ]);
    }

    private function makeRealisasi(Rab $rab, int $jumlah = 2_000_000): RealisasiPengeluaran
    {
        return RealisasiPengeluaran::create([
            'rab_id'          => $rab->id,
            'keterangan'      => 'Pembelian bahan',
            'jumlah'          => $jumlah,
            'tgl_pengeluaran' => today()->toDateString(),
            'input_by'        => $this->kepala->id,
        ]);
    }

    // ─── summary ─────────────────────────────────────────────────────────────

    public function test_summary_returns_all_9_divisi(): void
    {
        $this->makeRab('LOGISTIK', 10_000_000);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/keuangan/rab/summary?musim={$this->musim}");

        $res->assertOk()
            ->assertJsonStructure([
                'musim',
                'divisi' => [['divisi', 'rab_id', 'jumlah_anggaran', 'total_realisasi', 'selisih', 'persen_terpakai']],
            ]);

        $this->assertCount(9, $res->json('divisi')); // all DivisiKas enum values
        $this->assertEquals($this->musim, $res->json('musim'));
    }

    public function test_summary_shows_correct_totals(): void
    {
        $rab = $this->makeRab('LOGISTIK', 10_000_000);
        $this->makeRealisasi($rab, 3_000_000);
        $this->makeRealisasi($rab, 2_000_000);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/keuangan/rab/summary?musim={$this->musim}");

        $logistik = collect($res->json('divisi'))->firstWhere('divisi', 'LOGISTIK');

        $this->assertEquals(10_000_000, $logistik['jumlah_anggaran']);
        $this->assertEquals(5_000_000,  $logistik['total_realisasi']);
        $this->assertEquals(5_000_000,  $logistik['selisih']);
        $this->assertEquals(50.0,       $logistik['persen_terpakai']);
    }

    public function test_summary_divisi_without_rab_shows_zeros(): void
    {
        $res = $this->actingAs($this->kepala)
            ->getJson("/api/keuangan/rab/summary?musim={$this->musim}");

        $admin = collect($res->json('divisi'))->firstWhere('divisi', 'ADMIN');

        $this->assertNull($admin['rab_id']);
        $this->assertEquals(0,    $admin['jumlah_anggaran']);
        $this->assertEquals(0,    $admin['total_realisasi']);
        $this->assertEquals(0.0,  $admin['persen_terpakai']);
    }

    public function test_summary_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        Rab::create([
            'depot_id' => $otherDepot->id, 'divisi' => 'ADMIN',
            'musim' => $this->musim, 'jumlah_anggaran' => 99_000_000,
        ]);
        $this->makeRab('LOGISTIK', 10_000_000);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/keuangan/rab/summary?musim={$this->musim}");

        $admin = collect($res->json('divisi'))->firstWhere('divisi', 'ADMIN');
        $this->assertEquals(0, $admin['jumlah_anggaran']); // other depot not visible
    }

    // ─── store RAB ────────────────────────────────────────────────────────────

    public function test_kepala_can_create_rab(): void
    {
        $res = $this->actingAs($this->kepala)->postJson('/api/keuangan/rab', [
            'divisi'          => 'LOGISTIK',
            'musim'           => $this->musim,
            'jumlah_anggaran' => 15_000_000,
        ]);

        $res->assertCreated()->assertJsonPath('rab.divisi', 'LOGISTIK');
        $this->assertDatabaseHas('rab', ['divisi' => 'LOGISTIK', 'jumlah_anggaran' => 15_000_000]);
    }

    public function test_store_rab_updates_existing_same_divisi_musim(): void
    {
        $this->makeRab('LOGISTIK', 10_000_000);

        $res = $this->actingAs($this->kepala)->postJson('/api/keuangan/rab', [
            'divisi'          => 'LOGISTIK',
            'musim'           => $this->musim,
            'jumlah_anggaran' => 20_000_000,
        ]);

        $res->assertOk()->assertJsonPath('rab.jumlah_anggaran', 20_000_000);
        $this->assertDatabaseCount('rab', 1); // no duplicate
    }

    public function test_store_rab_validates_required_fields(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/rab', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['divisi', 'musim', 'jumlah_anggaran']);
    }

    public function test_store_rab_rejects_invalid_divisi(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/rab', [
            'divisi' => 'MARKETING', 'musim' => $this->musim, 'jumlah_anggaran' => 1_000_000,
        ])->assertUnprocessable()->assertJsonValidationErrors(['divisi']);
    }

    // ─── realisasi ───────────────────────────────────────────────────────────

    public function test_kepala_can_add_realisasi(): void
    {
        $rab = $this->makeRab();

        $res = $this->actingAs($this->kepala)
            ->postJson("/api/keuangan/rab/{$rab->id}/realisasi", [
                'keterangan'      => 'Sewa truk',
                'jumlah'          => 3_000_000,
                'tgl_pengeluaran' => today()->toDateString(),
            ]);

        $res->assertCreated()->assertJsonPath('realisasi.jumlah', 3_000_000);
        $this->assertDatabaseHas('realisasi_pengeluaran', [
            'jumlah'     => 3_000_000,
            'keterangan' => 'Sewa truk',
        ]);
    }

    public function test_realisasi_auto_creates_kas_harian_keluar(): void
    {
        $rab = $this->makeRab('LOGISTIK', 10_000_000);

        $this->actingAs($this->kepala)
            ->postJson("/api/keuangan/rab/{$rab->id}/realisasi", [
                'keterangan'      => 'Sewa truk',
                'jumlah'          => 3_000_000,
                'tgl_pengeluaran' => today()->toDateString(),
            ]);

        $this->assertDatabaseHas('kas_harian', [
            'depot_id' => $this->depot->id,
            'tipe'     => 'KELUAR',
            'divisi'   => 'LOGISTIK',
            'jumlah'   => 3_000_000,
        ]);
    }

    public function test_realisasi_validates_required_fields(): void
    {
        $rab = $this->makeRab();

        $this->actingAs($this->kepala)
            ->postJson("/api/keuangan/rab/{$rab->id}/realisasi", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['keterangan', 'jumlah', 'tgl_pengeluaran']);
    }

    public function test_cannot_add_realisasi_to_other_depots_rab(): void
    {
        $otherDepot = Depot::factory()->create();
        $otherRab   = Rab::create([
            'depot_id' => $otherDepot->id, 'divisi' => 'ADMIN',
            'musim' => $this->musim, 'jumlah_anggaran' => 5_000_000,
        ]);

        $this->actingAs($this->kepala)
            ->postJson("/api/keuangan/rab/{$otherRab->id}/realisasi", [
                'keterangan' => 'Test', 'jumlah' => 1_000_000,
                'tgl_pengeluaran' => today()->toDateString(),
            ])
            ->assertForbidden();
    }

    public function test_kepala_can_list_realisasi(): void
    {
        $rab = $this->makeRab();
        $this->makeRealisasi($rab, 1_000_000);
        $this->makeRealisasi($rab, 2_000_000);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/keuangan/rab/{$rab->id}/realisasi");

        $res->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'keterangan', 'jumlah', 'tgl_pengeluaran']],
                'rab',
            ]);
        $this->assertCount(2, $res->json('data'));
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/keuangan/rab/summary')->assertUnauthorized();
        $this->postJson('/api/keuangan/rab', [])->assertUnauthorized();
    }
}
```

Save to `backend/tests/Feature/Keuangan/RabTest.php`.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Keuangan/RabTest.php --no-coverage 2>&1 | tail -10
```

Expected: all tests FAIL with 404 (routes not yet registered).

- [ ] **Step 3: Commit failing tests**

```bash
cd /c/Users/USER/projects/simhq
git add backend/tests/Feature/Keuangan/RabTest.php
git commit -m "test(rab): add failing RabTest (TDD)"
```

---

## Task 3: RabController + Routes

**Files:**
- Create: `backend/app/Http/Controllers/RabController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write RabController**

```php
<?php

namespace App\Http\Controllers;

use App\Enums\DivisiKas;
use App\Models\KasHarian;
use App\Models\Rab;
use App\Models\RealisasiPengeluaran;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RabController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;
        $musim   = (int) $request->input('musim', date('Y'));

        $rabByDivisi = Rab::where('depot_id', $depotId)
            ->where('musim', $musim)
            ->withSum('realisasi', 'jumlah')
            ->get()
            ->keyBy('divisi');

        $divisiList = array_column(DivisiKas::cases(), 'value');

        $result = array_map(function (string $divisi) use ($rabByDivisi): array {
            $rab            = $rabByDivisi->get($divisi);
            $anggaran       = $rab ? $rab->jumlah_anggaran : 0;
            $totalRealisasi = $rab ? (int) ($rab->realisasi_sum_jumlah ?? 0) : 0;
            $selisih        = $anggaran - $totalRealisasi;
            $persen         = $anggaran > 0 ? round($totalRealisasi / $anggaran * 100, 1) : 0.0;

            return [
                'divisi'          => $divisi,
                'rab_id'          => $rab?->id,
                'jumlah_anggaran' => $anggaran,
                'total_realisasi' => $totalRealisasi,
                'selisih'         => $selisih,
                'persen_terpakai' => $persen,
            ];
        }, $divisiList);

        return response()->json(['musim' => $musim, 'divisi' => $result]);
    }

    public function store(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin()
            ? ($request->depot_id ?? $user->depot_id)
            : $user->depot_id;

        $data = $request->validate([
            'divisi'          => ['required', Rule::in(array_column(DivisiKas::cases(), 'value'))],
            'musim'           => ['required', 'integer', 'min:2020', 'max:2099'],
            'jumlah_anggaran' => ['required', 'integer', 'min:0'],
        ]);

        $rab = Rab::updateOrCreate(
            ['depot_id' => $depotId, 'divisi' => $data['divisi'], 'musim' => $data['musim']],
            ['jumlah_anggaran' => $data['jumlah_anggaran'], 'created_by' => $user->id]
        );

        $status = $rab->wasRecentlyCreated ? 201 : 200;

        return response()->json(['rab' => $rab], $status);
    }

    public function indexRealisasi(Request $request, Rab $rab): JsonResponse
    {
        $depotId = $request->user()->isSuperAdmin()
            ? ($request->depot_id ?? $request->user()->depot_id)
            : $request->user()->depot_id;

        abort_unless($rab->depot_id === $depotId, 403);

        $items = $rab->realisasi()
            ->with('inputBy:id,name')
            ->orderBy('tgl_pengeluaran', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json(['data' => $items, 'rab' => $rab]);
    }

    public function storeRealisasi(Request $request, Rab $rab): JsonResponse
    {
        $depotId = $request->user()->isSuperAdmin()
            ? ($request->depot_id ?? $request->user()->depot_id)
            : $request->user()->depot_id;

        abort_unless($rab->depot_id === $depotId, 403);

        $data = $request->validate([
            'keterangan'      => ['required', 'string', 'max:300'],
            'jumlah'          => ['required', 'integer', 'min:1'],
            'tgl_pengeluaran' => ['required', 'date'],
        ]);

        $user = $request->user();

        $realisasi = DB::transaction(function () use ($rab, $data, $user): RealisasiPengeluaran {
            $realisasi = RealisasiPengeluaran::create(array_merge($data, [
                'rab_id'   => $rab->id,
                'input_by' => $user->id,
            ]));

            KasHarian::create([
                'depot_id'      => $rab->depot_id,
                'tipe'          => 'KELUAR',
                'sumber'        => null,
                'divisi'        => $rab->divisi,
                'keterangan'    => "RAB {$rab->divisi}: {$data['keterangan']}",
                'jumlah'        => $data['jumlah'],
                'metode'        => 'CASH',
                'tgl_transaksi' => $data['tgl_pengeluaran'],
                'input_by'      => $user->id,
                'transaksi_id'  => null,
            ]);

            return $realisasi;
        });

        return response()->json(['realisasi' => $realisasi->load('inputBy:id,name')], 201);
    }
}
```

Save to `backend/app/Http/Controllers/RabController.php`.

- [ ] **Step 2: Register routes in `backend/routes/api.php`**

Inside the existing `role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_KETUA` middleware group, add after the setoran-gum routes:

```php
// RAB — summary static route MUST come before {rab} wildcard
Route::get('keuangan/rab/summary',         [\App\Http\Controllers\RabController::class, 'summary']);
Route::post('keuangan/rab',                 [\App\Http\Controllers\RabController::class, 'store']);
Route::get('keuangan/rab/{rab}/realisasi',  [\App\Http\Controllers\RabController::class, 'indexRealisasi']);
Route::post('keuangan/rab/{rab}/realisasi', [\App\Http\Controllers\RabController::class, 'storeRealisasi']);
```

The full updated keuangan middleware block:

```php
// Keuangan BIOP
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_KETUA')->group(function () {
    Route::get('keuangan/kas/export',        [\App\Http\Controllers\KasController::class,       'export']);
    Route::get('keuangan/kas',               [\App\Http\Controllers\KasController::class,       'index']);
    Route::post('keuangan/kas',              [\App\Http\Controllers\KasController::class,       'store']);
    Route::get('keuangan/saldo',             [\App\Http\Controllers\KasController::class,       'saldo']);
    Route::get('keuangan/cashflow',          [\App\Http\Controllers\KasController::class,       'cashflow']);
    // Setoran GUM
    Route::get('keuangan/setoran-gum/posisi', [\App\Http\Controllers\SetoranGumController::class, 'posisi']);
    Route::get('keuangan/setoran-gum',        [\App\Http\Controllers\SetoranGumController::class, 'index']);
    Route::post('keuangan/setoran-gum',       [\App\Http\Controllers\SetoranGumController::class, 'store']);
    // RAB — summary MUST be before {rab} wildcard
    Route::get('keuangan/rab/summary',         [\App\Http\Controllers\RabController::class, 'summary']);
    Route::post('keuangan/rab',                 [\App\Http\Controllers\RabController::class, 'store']);
    Route::get('keuangan/rab/{rab}/realisasi',  [\App\Http\Controllers\RabController::class, 'indexRealisasi']);
    Route::post('keuangan/rab/{rab}/realisasi', [\App\Http\Controllers\RabController::class, 'storeRealisasi']);
});
```

- [ ] **Step 3: Run tests — expect all green**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Keuangan/RabTest.php --no-coverage 2>&1 | tail -15
```

Expected: all tests PASS. If any fail, read the error and fix before continuing.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/RabController.php backend/routes/api.php
git commit -m "feat(rab): add RabController + routes (summary, store, realisasi)"
```

---

## Task 4: Frontend — RabSummaryTable Component

**Files:**
- Create: `frontend/app/(dashboard)/keuangan/rab/components/RabSummaryTable.tsx`

- [ ] **Step 1: Write RabSummaryTable component**

```tsx
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Settings, Plus } from 'lucide-react'

export interface DivisiRow {
  divisi: string
  rab_id: number | null
  jumlah_anggaran: number
  total_realisasi: number
  selisih: number
  persen_terpakai: number
}

interface RabSummaryTableProps {
  rows: DivisiRow[]
  onSetRab: (row: DivisiRow) => void
  onAddRealisasi: (row: DivisiRow) => void
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

function progressColor(persen: number): string {
  if (persen >= 80) return 'bg-error'
  if (persen >= 70) return 'bg-[#ca8a04]'
  return 'bg-[#15803d]'
}

function textColor(persen: number): string {
  if (persen >= 80) return 'text-error'
  if (persen >= 70) return 'text-[#ca8a04]'
  return 'text-[#15803d]'
}

export function RabSummaryTable({ rows, onSetRab, onAddRealisasi }: RabSummaryTableProps) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-high">
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Divisi</th>
              <th className="text-right py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Anggaran</th>
              <th className="text-right py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Realisasi</th>
              <th className="text-right py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Selisih</th>
              <th className="py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest min-w-[140px]">% Terpakai</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.divisi} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                <td className="py-3 px-4 font-body font-medium text-on-surface">{row.divisi}</td>
                <td className="py-3 px-4 font-display text-right text-on-surface whitespace-nowrap">
                  {row.jumlah_anggaran > 0 ? rupiah(row.jumlah_anggaran) : <span className="text-on-surface-variant">—</span>}
                </td>
                <td className="py-3 px-4 font-display text-right text-on-surface whitespace-nowrap">
                  {rupiah(row.total_realisasi)}
                </td>
                <td className={`py-3 px-4 font-display font-semibold text-right whitespace-nowrap ${
                  row.jumlah_anggaran > 0 ? textColor(row.persen_terpakai) : 'text-on-surface-variant'
                }`}>
                  {row.jumlah_anggaran > 0 ? rupiah(row.selisih) : <span>—</span>}
                </td>
                <td className="py-3 px-4">
                  {row.jumlah_anggaran > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-surface-high rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${progressColor(row.persen_terpakai)}`}
                          style={{ width: `${Math.min(row.persen_terpakai, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-body font-medium whitespace-nowrap ${textColor(row.persen_terpakai)}`}>
                        {row.persen_terpakai}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-on-surface-variant">Belum diset</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => onSetRab(row)}
                      className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-high transition-colors"
                      title="Set RAB"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    {row.rab_id && (
                      <button
                        onClick={() => onAddRealisasi(row)}
                        className="p-1.5 rounded-md text-primary hover:bg-surface-high transition-colors"
                        title="Tambah Realisasi"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
```

Save to `frontend/app/(dashboard)/keuangan/rab/components/RabSummaryTable.tsx`.

- [ ] **Step 2: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/keuangan/rab/components/RabSummaryTable.tsx"
git commit -m "feat(rab): add RabSummaryTable component with progress bars"
```

---

## Task 5: Frontend — SetRabModal + TambahRealisasiModal

**Files:**
- Create: `frontend/app/(dashboard)/keuangan/rab/components/SetRabModal.tsx`
- Create: `frontend/app/(dashboard)/keuangan/rab/components/TambahRealisasiModal.tsx`

- [ ] **Step 1: Write SetRabModal**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

interface SetRabModalProps {
  divisi:          string
  musim:           number
  currentAnggaran: number
  onDone:          () => void
  onClose:         () => void
}

export function SetRabModal({ divisi, musim, currentAnggaran, onDone, onClose }: SetRabModalProps) {
  const [jumlah,  setJumlah]  = useState(currentAnggaran > 0 ? String(currentAnggaran) : '')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function submit() {
    if (!jumlah) { setError('Jumlah anggaran wajib diisi.'); return }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/keuangan/rab', {
        divisi,
        musim,
        jumlah_anggaran: Number(jumlah),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-card w-full max-w-sm p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-on-surface">
          Set RAB — {divisi}
        </h2>
        <p className="text-sm text-on-surface-variant">Musim {musim}</p>

        <Input
          label="Jumlah Anggaran (Rp)"
          type="number"
          min="0"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          placeholder="10000000"
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

Save to `frontend/app/(dashboard)/keuangan/rab/components/SetRabModal.tsx`.

- [ ] **Step 2: Write TambahRealisasiModal**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

interface TambahRealisasiModalProps {
  rabId:  number
  divisi: string
  onDone:  () => void
  onClose: () => void
}

export function TambahRealisasiModal({ rabId, divisi, onDone, onClose }: TambahRealisasiModalProps) {
  const [form, setForm] = useState({
    keterangan:      '',
    jumlah:          '',
    tgl_pengeluaran: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit() {
    if (!form.keterangan || !form.jumlah || !form.tgl_pengeluaran) {
      setError('Semua field wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post(`/api/keuangan/rab/${rabId}/realisasi`, {
        keterangan:      form.keterangan,
        jumlah:          Number(form.jumlah),
        tgl_pengeluaran: form.tgl_pengeluaran,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-card w-full max-w-md p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-on-surface">
          Tambah Realisasi — {divisi}
        </h2>

        <Input
          label="Keterangan"
          value={form.keterangan}
          onChange={(e) => set('keterangan', e.target.value)}
          placeholder="Mis. Sewa truk pengiriman"
        />

        <Input
          label="Jumlah (Rp)"
          type="number"
          min="1"
          value={form.jumlah}
          onChange={(e) => set('jumlah', e.target.value)}
          placeholder="1000000"
        />

        <Input
          label="Tanggal Pengeluaran"
          type="date"
          value={form.tgl_pengeluaran}
          onChange={(e) => set('tgl_pengeluaran', e.target.value)}
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

Save to `frontend/app/(dashboard)/keuangan/rab/components/TambahRealisasiModal.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/keuangan/rab/components/SetRabModal.tsx" \
        "frontend/app/(dashboard)/keuangan/rab/components/TambahRealisasiModal.tsx"
git commit -m "feat(rab): add SetRabModal and TambahRealisasiModal components"
```

---

## Task 6: Frontend — Page + Sidebar

**Files:**
- Create: `frontend/app/(dashboard)/keuangan/rab/page.tsx`
- Modify: `frontend/components/shared/Sidebar.tsx`

- [ ] **Step 1: Write page.tsx**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { RabSummaryTable, type DivisiRow } from './components/RabSummaryTable'
import { SetRabModal }          from './components/SetRabModal'
import { TambahRealisasiModal } from './components/TambahRealisasiModal'
import api from '@/lib/api'

export default function RabPage() {
  const currentYear = new Date().getFullYear()

  const [rows,    setRows]    = useState<DivisiRow[]>([])
  const [musim,   setMusim]   = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [setRabRow,       setSetRabRow]       = useState<DivisiRow | null>(null)
  const [realisasiRow,    setRealisasiRow]    = useState<DivisiRow | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/keuangan/rab/summary?musim=${musim}`)
      setRows(res.data.divisi ?? [])
    } catch {
      setError('Gagal memuat data RAB.')
    } finally {
      setLoading(false)
    }
  }, [musim])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">RAB & Realisasi</h1>
          <p className="text-sm text-on-surface-variant mt-1">Anggaran per divisi vs realisasi pengeluaran</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Musim</label>
          <input
            type="number"
            min="2020"
            max="2099"
            value={musim}
            onChange={(e) => setMusim(Number(e.target.value))}
            className="input-field text-sm w-24"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <RabSummaryTable
          rows={rows}
          onSetRab={(row) => setSetRabRow(row)}
          onAddRealisasi={(row) => setRealisasiRow(row)}
        />
      )}

      {setRabRow && (
        <SetRabModal
          divisi={setRabRow.divisi}
          musim={musim}
          currentAnggaran={setRabRow.jumlah_anggaran}
          onDone={() => { setSetRabRow(null); fetchData() }}
          onClose={() => setSetRabRow(null)}
        />
      )}

      {realisasiRow !== null && realisasiRow.rab_id !== null && (
        <TambahRealisasiModal
          rabId={realisasiRow.rab_id}
          divisi={realisasiRow.divisi}
          onDone={() => { setRealisasiRow(null); fetchData() }}
          onClose={() => setRealisasiRow(null)}
        />
      )}
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/keuangan/rab/page.tsx`.

- [ ] **Step 2: Update Sidebar**

In `frontend/components/shared/Sidebar.tsx`:

Add `BookOpen` to the lucide-react import:
```tsx
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  Wallet, Truck, ClipboardList, ClipboardCheck, LogOut, Database, PawPrint, Grid3x3, Receipt, Layers, BarChart2, HandCoins, BookOpen
} from 'lucide-react'
```

Add nav item AFTER the `/keuangan/setoran-gum` entry:
```tsx
  { href: '/keuangan/setoran-gum', label: 'Setoran GUM', icon: HandCoins,  roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
  { href: '/keuangan/rab',         label: 'RAB & Realisasi', icon: BookOpen, roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
```

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output. Fix any type errors before committing.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/keuangan/rab/page.tsx" frontend/components/shared/Sidebar.tsx
git commit -m "feat(rab): wire T-12 RAB page + sidebar link"
```

---

## Task 7: Verification + Close T-12

**Files:**
- Modify: `docs/tasks/T-12-rab-realisasi.md`
- Modify: `docs/TASKS.md`

- [ ] **Step 1: Run all backend tests**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Keuangan/RabTest.php --no-coverage 2>&1 | tail -15
```

Expected: all tests PASS.

- [ ] **Step 2: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -5
```

Expected: no output.

- [ ] **Step 3: Smoke test checklist**

With backend on :8000 and frontend on :3000:

- [ ] `/keuangan/rab` loads without errors (KEPALA_DEPOT role)
- [ ] All 9 divisi rows appear (KONSTRUKSI, LOGISTIK, ADMIN, CS, KANDANG, DISTRIBUSI, PAKAN, LISTRIK, LAIN)
- [ ] Rows without RAB show "Belum diset" and "—" for anggaran
- [ ] Settings icon opens SetRabModal for any divisi
- [ ] Set a RAB (e.g. LOGISTIK = 10.000.000) → row updates with anggaran and progress bar
- [ ] Plus icon appears for rows with RAB — opens TambahRealisasiModal
- [ ] Add realisasi → row's realisasi + progress bar update
- [ ] Progress bar green < 70%, yellow 70-90%, red > 90%
- [ ] Sidebar shows "RAB & Realisasi" link
- [ ] Musim year input changes data

- [ ] **Step 4: Update T-12 task doc**

In `docs/tasks/T-12-rab-realisasi.md`:
- Change `**Status:** \`TODO\`` → `**Status:** \`DONE\``
- Change all `- [ ]` in Acceptance Criteria and Technical Tasks to `- [x]`
- Note in Notes: "WA notification (>80% alert via T-17) deferred until T-17 is implemented"

- [ ] **Step 5: Update TASKS.md**

- T-12 row: `⬜ TODO` → `✅ DONE`
- Phase 2 progress: `3 / 10` → `4 / 10`
- Summary table: Phase 2 Selesai `3→4`, Sisa `7→6`; TOTAL Selesai `11→12`, Sisa `14→13`

- [ ] **Step 6: Commit + tag**

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-12-rab-realisasi.md docs/TASKS.md
git commit -m "docs: mark T-12 RAB & Realisasi as DONE"
git tag t-12-complete
```

---

## Acceptance Criteria Checklist

- [ ] Input RAB per divisi (KEPALA_DEPOT/SUPER_ADMIN) with upsert for same divisi+musim
- [ ] Input realisasi pengeluaran per divisi (detail rincian)
- [ ] Auto-compute selisih = anggaran − realisasi
- [ ] Alert via color: green <70%, yellow 70-90%, red >90%
- [ ] WA notification deferred (T-17 not yet implemented)
- [ ] Laporan: tabel RAB vs realisasi semua 9 divisi
- [ ] All backend tests pass
- [ ] Frontend `/keuangan/rab` accessible to KEPALA_DEPOT
- [ ] RabSummaryTable shows all divisi with progress bars
- [ ] SetRabModal saves and refreshes
- [ ] TambahRealisasiModal saves realisasi + auto-creates kas_harian KELUAR
