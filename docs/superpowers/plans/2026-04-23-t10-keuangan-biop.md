# T-10 Laporan Keuangan BIOP & Cash Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a digital cash ledger (BIOP) — manual kas masuk/keluar input, auto-kas from POS payments, daily cash flow chart, saldo summary per method, and CSV export.

**Architecture:** New `kas_harian` table records every cash movement per depot. `PembayaranController::store()` auto-creates a MASUK entry for each payment recorded in POS. `KasController` exposes list/create/saldo/cashflow/export endpoints. Frontend `/keuangan` page has saldo cards, area chart (recharts already installed), entry table, and create modal. Sidebar already includes `/keuangan` link — no sidebar change needed.

**Tech Stack:** Laravel 11 (Eloquent, RefreshDatabase tests), Next.js 14 App Router (Client Component), recharts AreaChart, TypeScript, PHPUnit TDD

---

## File Map

### Backend — Create
```
backend/
  database/migrations/{ts}_create_kas_harian_table.php
  app/Enums/TipeKas.php
  app/Enums/SumberKas.php
  app/Enums/DivisiKas.php
  app/Models/KasHarian.php
  database/factories/KasHarianFactory.php
  app/Http/Controllers/KasController.php
  tests/Feature/Keuangan/KasTest.php
```

### Backend — Modify
```
backend/
  routes/api.php                                    ← add keuangan routes
  app/Http/Controllers/PembayaranController.php     ← auto-kas on each payment
```

### Frontend — Create
```
frontend/
  app/(dashboard)/keuangan/page.tsx
  app/(dashboard)/keuangan/components/SaldoCards.tsx
  app/(dashboard)/keuangan/components/CashFlowChart.tsx
  app/(dashboard)/keuangan/components/KasTable.tsx
  app/(dashboard)/keuangan/components/TambahKasModal.tsx
```

---

## Task 1: Backend — Migration + Enums + Model + Factory

**Files:**
- Create: `backend/database/migrations/{ts}_create_kas_harian_table.php`
- Create: `backend/app/Enums/TipeKas.php`
- Create: `backend/app/Enums/SumberKas.php`
- Create: `backend/app/Enums/DivisiKas.php`
- Create: `backend/app/Models/KasHarian.php`
- Create: `backend/database/factories/KasHarianFactory.php`

### Step 1: Create migration

```bash
cd backend && php artisan make:migration create_kas_harian_table
```

Edit the generated file in `database/migrations/`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kas_harian', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->enum('tipe', ['MASUK', 'KELUAR']);
            $table->string('sumber', 20)->nullable();   // PENJUALAN | DEPOSIT | LAIN — for MASUK
            $table->string('divisi', 30)->nullable();   // KONSTRUKSI | LOGISTIK | ... — for KELUAR
            $table->string('keterangan', 300);
            $table->unsignedInteger('jumlah');
            $table->enum('metode', ['CASH', 'TRANSFER_BCA', 'TRANSFER_LAIN'])->default('CASH');
            $table->date('tgl_transaksi');
            $table->foreignId('input_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('transaksi_id')->nullable()->constrained('transaksi')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kas_harian');
    }
};
```

### Step 2: Create enums

```php
<?php
// backend/app/Enums/TipeKas.php
namespace App\Enums;

enum TipeKas: string
{
    case MASUK  = 'MASUK';
    case KELUAR = 'KELUAR';
}
```

```php
<?php
// backend/app/Enums/SumberKas.php
namespace App\Enums;

enum SumberKas: string
{
    case PENJUALAN = 'PENJUALAN';
    case DEPOSIT   = 'DEPOSIT';
    case LAIN      = 'LAIN';
}
```

```php
<?php
// backend/app/Enums/DivisiKas.php
namespace App\Enums;

enum DivisiKas: string
{
    case KONSTRUKSI = 'KONSTRUKSI';
    case LOGISTIK   = 'LOGISTIK';
    case ADMIN      = 'ADMIN';
    case CS         = 'CS';
    case KANDANG    = 'KANDANG';
    case DISTRIBUSI = 'DISTRIBUSI';
    case PAKAN      = 'PAKAN';
    case LISTRIK    = 'LISTRIK';
    case LAIN       = 'LAIN';
}
```

### Step 3: Create KasHarian model

```php
<?php
// backend/app/Models/KasHarian.php
namespace App\Models;

use App\Enums\TipeKas;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KasHarian extends Model
{
    protected $table = 'kas_harian';

    protected $fillable = [
        'depot_id', 'tipe', 'sumber', 'divisi', 'keterangan',
        'jumlah', 'metode', 'tgl_transaksi', 'input_by', 'transaksi_id',
    ];

    protected $casts = [
        'tipe'           => TipeKas::class,
        'jumlah'         => 'integer',
        'tgl_transaksi'  => 'date',
    ];

    public function depot(): BelongsTo      { return $this->belongsTo(Depot::class); }
    public function inputBy(): BelongsTo    { return $this->belongsTo(User::class, 'input_by'); }
    public function transaksi(): BelongsTo  { return $this->belongsTo(Transaksi::class); }
}
```

### Step 4: Create KasHarianFactory

```php
<?php
// backend/database/factories/KasHarianFactory.php
namespace Database\Factories;

use App\Enums\TipeKas;
use App\Models\Depot;
use Illuminate\Database\Eloquent\Factories\Factory;

class KasHarianFactory extends Factory
{
    public function definition(): array
    {
        $tipe = $this->faker->randomElement(['MASUK', 'KELUAR']);
        return [
            'depot_id'      => Depot::factory(),
            'tipe'          => $tipe,
            'sumber'        => $tipe === 'MASUK' ? $this->faker->randomElement(['PENJUALAN','DEPOSIT','LAIN']) : null,
            'divisi'        => $tipe === 'KELUAR' ? $this->faker->randomElement(['ADMIN','LOGISTIK','KANDANG']) : null,
            'keterangan'    => $this->faker->sentence(4),
            'jumlah'        => $this->faker->numberBetween(100_000, 5_000_000),
            'metode'        => $this->faker->randomElement(['CASH', 'TRANSFER_BCA']),
            'tgl_transaksi' => $this->faker->dateTimeBetween('-30 days', 'now')->format('Y-m-d'),
            'input_by'      => null,
            'transaksi_id'  => null,
        ];
    }

    public function masuk(): static
    {
        return $this->state([
            'tipe'   => TipeKas::MASUK,
            'sumber' => 'DEPOSIT',
            'divisi' => null,
        ]);
    }

    public function keluar(): static
    {
        return $this->state([
            'tipe'   => TipeKas::KELUAR,
            'sumber' => null,
            'divisi' => 'ADMIN',
        ]);
    }
}
```

### Step 5: Run migration

```bash
cd backend && php artisan migrate
```

Expected: `kas_harian` table created with no errors.

### Step 6: Commit

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/ backend/app/Enums/TipeKas.php \
        backend/app/Enums/SumberKas.php backend/app/Enums/DivisiKas.php \
        backend/app/Models/KasHarian.php backend/database/factories/KasHarianFactory.php
git commit -m "feat(keuangan): add kas_harian migration, enums, model, factory"
```

---

## Task 2: Backend — KasController (TDD)

**Files:**
- Create: `backend/tests/Feature/Keuangan/KasTest.php`
- Create: `backend/app/Http/Controllers/KasController.php`
- Modify: `backend/routes/api.php`

### Step 1: Write failing tests

```php
<?php
// backend/tests/Feature/Keuangan/KasTest.php

namespace Tests\Feature\Keuangan;

use App\Enums\TipeKas;
use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\KasHarian;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KasTest extends TestCase
{
    use RefreshDatabase;

    private User $kepala;
    private Depot $depot;
    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot  = Depot::factory()->create();
        $this->kepala = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);
    }

    private function makeKas(array $attrs = []): KasHarian
    {
        $this->seq++;
        return KasHarian::create(array_merge([
            'depot_id'      => $this->depot->id,
            'tipe'          => 'MASUK',
            'sumber'        => 'DEPOSIT',
            'divisi'        => null,
            'keterangan'    => "Kas #{$this->seq}",
            'jumlah'        => 1_000_000,
            'metode'        => 'CASH',
            'tgl_transaksi' => today()->toDateString(),
            'input_by'      => $this->kepala->id,
            'transaksi_id'  => null,
        ], $attrs));
    }

    // ── LIST ────────────────────────────────────────────────────────────────

    public function test_kepala_can_list_kas_entries(): void
    {
        $this->makeKas();
        $this->makeKas(['tipe' => 'KELUAR', 'sumber' => null, 'divisi' => 'ADMIN', 'jumlah' => 500_000]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/kas');

        $res->assertOk()
            ->assertJsonStructure([
                'entries' => ['data', 'total', 'per_page', 'current_page'],
                'summary' => ['total_masuk', 'total_keluar', 'saldo', 'per_metode'],
            ]);

        $this->assertCount(2, $res->json('entries.data'));
        $this->assertEquals(1_000_000, $res->json('summary.total_masuk'));
        $this->assertEquals(500_000,   $res->json('summary.total_keluar'));
        $this->assertEquals(500_000,   $res->json('summary.saldo'));
    }

    public function test_list_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        $this->makeKas(); // own
        KasHarian::create([
            'depot_id' => $otherDepot->id, 'tipe' => 'MASUK', 'sumber' => 'DEPOSIT',
            'divisi' => null, 'keterangan' => 'Other', 'jumlah' => 999_000,
            'metode' => 'CASH', 'tgl_transaksi' => today()->toDateString(),
        ]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/kas');

        $this->assertCount(1, $res->json('entries.data'));
    }

    public function test_list_filter_by_divisi(): void
    {
        $this->makeKas(['tipe' => 'KELUAR', 'sumber' => null, 'divisi' => 'ADMIN']);
        $this->makeKas(['tipe' => 'KELUAR', 'sumber' => null, 'divisi' => 'LOGISTIK']);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/kas?divisi=ADMIN');

        $this->assertCount(1, $res->json('entries.data'));
        $this->assertEquals('ADMIN', $res->json('entries.data.0.divisi'));
    }

    public function test_list_filter_by_date_range(): void
    {
        $this->makeKas(['tgl_transaksi' => '2026-04-01']);
        $this->makeKas(['tgl_transaksi' => '2026-04-15']);
        $this->makeKas(['tgl_transaksi' => '2026-04-30']);

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/keuangan/kas?tgl_dari=2026-04-10&tgl_sampai=2026-04-20');

        $this->assertCount(1, $res->json('entries.data'));
    }

    // ── CREATE ──────────────────────────────────────────────────────────────

    public function test_can_create_kas_masuk(): void
    {
        $res = $this->actingAs($this->kepala)->postJson('/api/keuangan/kas', [
            'tipe'          => 'MASUK',
            'sumber'        => 'DEPOSIT',
            'keterangan'    => 'Setoran tunai',
            'jumlah'        => 3_000_000,
            'metode'        => 'CASH',
            'tgl_transaksi' => today()->toDateString(),
        ]);

        $res->assertCreated()->assertJsonPath('kas.tipe', 'MASUK');
        $this->assertDatabaseHas('kas_harian', ['keterangan' => 'Setoran tunai', 'jumlah' => 3_000_000]);
    }

    public function test_can_create_kas_keluar(): void
    {
        $res = $this->actingAs($this->kepala)->postJson('/api/keuangan/kas', [
            'tipe'          => 'KELUAR',
            'divisi'        => 'LOGISTIK',
            'keterangan'    => 'Bensin truk',
            'jumlah'        => 200_000,
            'metode'        => 'CASH',
            'tgl_transaksi' => today()->toDateString(),
        ]);

        $res->assertCreated()->assertJsonPath('kas.tipe', 'KELUAR');
        $this->assertDatabaseHas('kas_harian', ['divisi' => 'LOGISTIK', 'jumlah' => 200_000]);
    }

    public function test_create_validates_required_fields(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/kas', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tipe', 'keterangan', 'jumlah', 'metode', 'tgl_transaksi']);
    }

    public function test_masuk_requires_sumber(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/kas', [
            'tipe' => 'MASUK', 'keterangan' => 'Test', 'jumlah' => 100_000,
            'metode' => 'CASH', 'tgl_transaksi' => today()->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors(['sumber']);
    }

    public function test_keluar_requires_divisi(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/kas', [
            'tipe' => 'KELUAR', 'keterangan' => 'Test', 'jumlah' => 100_000,
            'metode' => 'CASH', 'tgl_transaksi' => today()->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors(['divisi']);
    }

    // ── SALDO ────────────────────────────────────────────────────────────────

    public function test_saldo_is_masuk_minus_keluar_up_to_date(): void
    {
        $this->makeKas(['jumlah' => 5_000_000, 'tgl_transaksi' => '2026-04-01']);
        $this->makeKas(['tipe' => 'KELUAR', 'sumber' => null, 'divisi' => 'ADMIN', 'jumlah' => 2_000_000, 'tgl_transaksi' => '2026-04-10']);
        $this->makeKas(['jumlah' => 1_000_000, 'tgl_transaksi' => '2026-04-20']); // future, should be excluded if tgl < this

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/saldo?tgl=2026-04-15');

        $res->assertOk()
            ->assertJsonPath('total_masuk', 5_000_000)
            ->assertJsonPath('total_keluar', 2_000_000)
            ->assertJsonPath('saldo', 3_000_000);
    }

    // ── CASHFLOW ─────────────────────────────────────────────────────────────

    public function test_cashflow_returns_daily_aggregation(): void
    {
        $this->makeKas(['jumlah' => 3_000_000, 'tgl_transaksi' => '2026-04-01']);
        $this->makeKas(['tipe' => 'KELUAR', 'sumber' => null, 'divisi' => 'ADMIN', 'jumlah' => 1_000_000, 'tgl_transaksi' => '2026-04-01']);
        $this->makeKas(['jumlah' => 2_000_000, 'tgl_transaksi' => '2026-04-02']);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/cashflow?bulan=2026-04');

        $res->assertOk()->assertJsonStructure(['data' => [['tanggal', 'masuk', 'keluar']]]);

        $day1 = collect($res->json('data'))->firstWhere('tanggal', '2026-04-01');
        $this->assertEquals(3_000_000, $day1['masuk']);
        $this->assertEquals(1_000_000, $day1['keluar']);
    }

    // ── ACCESS CONTROL ───────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/keuangan/kas')->assertUnauthorized();
    }
}
```

### Step 2: Run tests to verify failure

```bash
cd backend && php artisan test tests/Feature/Keuangan/KasTest.php 2>&1 | tail -10
```

Expected: FAIL — route not found.

### Step 3: Create KasController

```php
<?php
// backend/app/Http/Controllers/KasController.php

namespace App\Http\Controllers;

use App\Enums\SumberKas;
use App\Enums\TipeKas;
use App\Models\KasHarian;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class KasController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? $request->depot_id : $user->depot_id;

        $base = KasHarian::where('depot_id', $depotId);

        if ($request->tgl_dari) {
            $base->where('tgl_transaksi', '>=', $request->tgl_dari);
        }
        if ($request->tgl_sampai) {
            $base->where('tgl_transaksi', '<=', $request->tgl_sampai);
        }
        if ($request->divisi) {
            $base->where('divisi', $request->divisi);
        }

        $entries = (clone $base)
            ->with('inputBy:id,name')
            ->orderBy('tgl_transaksi', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(50);

        $summary = $this->buildSummary(clone $base);

        return response()->json([
            'entries' => $entries,
            'summary' => $summary,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin()
            ? ($request->depot_id ?? $user->depot_id)
            : $user->depot_id;

        $data = $request->validate([
            'tipe'          => ['required', 'in:MASUK,KELUAR'],
            'sumber'        => [Rule::requiredIf($request->tipe === 'MASUK'), 'nullable', Rule::in(array_column(SumberKas::cases(), 'value'))],
            'divisi'        => [Rule::requiredIf($request->tipe === 'KELUAR'), 'nullable', 'string', 'max:30'],
            'keterangan'    => ['required', 'string', 'max:300'],
            'jumlah'        => ['required', 'integer', 'min:1'],
            'metode'        => ['required', 'in:CASH,TRANSFER_BCA,TRANSFER_LAIN'],
            'tgl_transaksi' => ['required', 'date'],
        ]);

        $kas = KasHarian::create(array_merge($data, [
            'depot_id' => $depotId,
            'input_by' => $user->id,
        ]));

        return response()->json(['kas' => $kas->load('inputBy:id,name')], 201);
    }

    public function saldo(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? $request->depot_id : $user->depot_id;
        $tgl     = $request->input('tgl', today()->toDateString());

        $base = KasHarian::where('depot_id', $depotId)
            ->where('tgl_transaksi', '<=', $tgl);

        $summary = $this->buildSummary($base);

        return response()->json(array_merge($summary, ['tgl' => $tgl]));
    }

    public function cashflow(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? $request->depot_id : $user->depot_id;
        $bulan   = $request->input('bulan', now()->format('Y-m'));

        [$year, $month] = explode('-', $bulan);
        $start = "{$bulan}-01";
        $end   = date('Y-m-t', mktime(0, 0, 0, (int)$month, 1, (int)$year));

        $rows = KasHarian::where('depot_id', $depotId)
            ->whereBetween('tgl_transaksi', [$start, $end])
            ->select(
                'tgl_transaksi',
                DB::raw("SUM(CASE WHEN tipe = 'MASUK' THEN jumlah ELSE 0 END) as masuk"),
                DB::raw("SUM(CASE WHEN tipe = 'KELUAR' THEN jumlah ELSE 0 END) as keluar")
            )
            ->groupBy('tgl_transaksi')
            ->orderBy('tgl_transaksi')
            ->get()
            ->map(fn($r) => [
                'tanggal' => $r->tgl_transaksi->toDateString(),
                'masuk'   => (int) $r->masuk,
                'keluar'  => (int) $r->keluar,
            ])
            ->toArray();

        return response()->json(['data' => $rows]);
    }

    public function export(Request $request)
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? $request->depot_id : $user->depot_id;
        $bulan   = $request->input('bulan', now()->format('Y-m'));

        [$year, $month] = explode('-', $bulan);
        $start = "{$bulan}-01";
        $end   = date('Y-m-t', mktime(0, 0, 0, (int)$month, 1, (int)$year));

        $rows = KasHarian::where('depot_id', $depotId)
            ->whereBetween('tgl_transaksi', [$start, $end])
            ->with('inputBy:id,name')
            ->orderBy('tgl_transaksi')
            ->orderBy('id')
            ->get();

        $filename = "kas-{$bulan}.csv";

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Tanggal', 'Tipe', 'Sumber', 'Divisi', 'Keterangan', 'Jumlah', 'Metode', 'Input By']);
            foreach ($rows as $row) {
                fputcsv($handle, [
                    $row->tgl_transaksi->toDateString(),
                    $row->tipe->value,
                    $row->sumber ?? '',
                    $row->divisi ?? '',
                    $row->keterangan,
                    $row->jumlah,
                    $row->metode,
                    $row->inputBy?->name ?? '',
                ]);
            }
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function buildSummary($query): array
    {
        $counts = (clone $query)
            ->select(
                'tipe',
                DB::raw('SUM(jumlah) as total'),
            )
            ->groupBy('tipe')
            ->pluck('total', 'tipe')
            ->map(fn($v) => (int) $v)
            ->toArray();

        $perMetode = (clone $query)
            ->select(
                'metode',
                DB::raw("SUM(CASE WHEN tipe = 'MASUK' THEN jumlah ELSE 0 END) as masuk"),
                DB::raw("SUM(CASE WHEN tipe = 'KELUAR' THEN jumlah ELSE 0 END) as keluar")
            )
            ->groupBy('metode')
            ->get()
            ->map(fn($r) => [
                'metode' => $r->metode,
                'masuk'  => (int) $r->masuk,
                'keluar' => (int) $r->keluar,
            ])
            ->values()
            ->toArray();

        $totalMasuk  = $counts['MASUK']  ?? 0;
        $totalKeluar = $counts['KELUAR'] ?? 0;

        return [
            'total_masuk'  => $totalMasuk,
            'total_keluar' => $totalKeluar,
            'saldo'        => $totalMasuk - $totalKeluar,
            'per_metode'   => $perMetode,
        ];
    }
}
```

### Step 4: Register routes in api.php

Inside `Route::middleware('auth:sanctum')->group(function () {`, add after the dashboard route:

```php
    // Keuangan
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_KETUA')->group(function () {
        Route::get('keuangan/kas/export', [\App\Http\Controllers\KasController::class, 'export']);
        Route::get('keuangan/kas',        [\App\Http\Controllers\KasController::class, 'index']);
        Route::post('keuangan/kas',       [\App\Http\Controllers\KasController::class, 'store']);
        Route::get('keuangan/saldo',      [\App\Http\Controllers\KasController::class, 'saldo']);
        Route::get('keuangan/cashflow',   [\App\Http\Controllers\KasController::class, 'cashflow']);
    });
```

Note: `keuangan/kas/export` must come before `keuangan/kas` to avoid routing ambiguity.

### Step 5: Run tests to verify pass

```bash
cd backend && php artisan test tests/Feature/Keuangan/KasTest.php 2>&1
```

Expected: 13 tests pass.

If `test_masuk_requires_sumber` fails: check that the `requiredIf` rule uses the raw request value. Laravel evaluates `Rule::requiredIf($request->tipe === 'MASUK')` before validation runs — this works because `$request->tipe` is the raw input value.

### Step 6: Run full suite

```bash
cd backend && php artisan test 2>&1 | tail -5
```

Expected: all passing.

### Step 7: Commit

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/KasController.php \
        backend/tests/Feature/Keuangan/KasTest.php \
        backend/routes/api.php
git commit -m "feat(keuangan): add KasController CRUD + saldo + cashflow + CSV export"
```

---

## Task 3: Backend — Auto-kas from POS payments (TDD)

**Files:**
- Modify: `backend/app/Http/Controllers/PembayaranController.php`
- Create: `backend/tests/Feature/Keuangan/AutoKasTest.php`

### Step 1: Write failing test

```php
<?php
// backend/tests/Feature/Keuangan/AutoKasTest.php

namespace Tests\Feature\Keuangan;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Depot;
use App\Models\Hewan;
use App\Models\KasHarian;
use App\Models\KelasHewan;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AutoKasTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Depot $depot;
    private KelasHewan $kelas;
    private Transaksi $transaksi;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin  = User::factory()->superAdmin()->create();
        $this->depot  = Depot::factory()->create();
        $this->kelas  = KelasHewan::create(['kode' => 'A1', 'nama' => 'Kelas A1', 'urutan' => 1]);
        $customer     = Customer::create(['nama' => 'Budi', 'hp' => '08111']);
        $hewan        = Hewan::create([
            'depot_id' => $this->depot->id, 'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id, 'no_hewan' => '001',
            'jenis' => 'SAPI', 'bobot_masuk' => 250, 'tgl_masuk' => today()->toDateString(),
            'musim' => 2026, 'status' => 'SOLD',
        ]);
        $this->transaksi = Transaksi::create([
            'depot_id'         => $this->depot->id,
            'no_faktur'        => 'INV-001',
            'hewan_id'         => $hewan->id,
            'customer_id'      => $customer->id,
            'tipe_qurban'      => 'SHQ',
            'jenis'            => 'SAPI',
            'kelas_id'         => $this->kelas->id,
            'harga'            => 6_000_000,
            'total'            => 6_000_000,
            'musim'            => 2026,
            'status_bayar'     => 'BELUM_BAYAR',
            'status_transaksi' => 'HEWAN_TERALOKASI',
        ]);
    }

    public function test_kas_harian_created_when_payment_stored(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/bayar", [
                'jumlah'   => 6_000_000,
                'tipe'     => 'PELUNASAN',
                'metode'   => 'CASH',
                'tgl_bayar'=> today()->toDateString(),
            ])->assertCreated();

        $this->assertDatabaseHas('kas_harian', [
            'depot_id'  => $this->depot->id,
            'tipe'      => 'MASUK',
            'sumber'    => 'PENJUALAN',
            'jumlah'    => 6_000_000,
            'metode'    => 'CASH',
            'transaksi_id' => $this->transaksi->id,
        ]);
    }

    public function test_kas_harian_uses_payment_metode(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/bayar", [
                'jumlah'   => 3_000_000,
                'tipe'     => 'DP',
                'metode'   => 'TRANSFER_BCA',
                'tgl_bayar'=> today()->toDateString(),
            ])->assertCreated();

        $this->assertDatabaseHas('kas_harian', [
            'metode' => 'TRANSFER_BCA',
            'jumlah' => 3_000_000,
        ]);
    }

    public function test_kas_harian_keterangan_includes_no_faktur(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/bayar", [
                'jumlah'   => 6_000_000,
                'tipe'     => 'PELUNASAN',
                'metode'   => 'CASH',
                'tgl_bayar'=> today()->toDateString(),
            ]);

        $kas = KasHarian::where('transaksi_id', $this->transaksi->id)->first();
        $this->assertStringContainsString('INV-001', $kas->keterangan);
    }
}
```

### Step 2: Run to verify failure

```bash
cd backend && php artisan test tests/Feature/Keuangan/AutoKasTest.php 2>&1 | tail -10
```

Expected: FAIL — no kas_harian row created.

### Step 3: Modify PembayaranController::store()

Add auto-kas creation after the pembayaran is created. Add these imports at the top of the file:

```php
use App\Models\KasHarian;
```

In `store()`, after the line `$this->svc->syncStatusBayar($transaksi);`, add:

```php
        // Auto-create BIOP entry for every payment
        KasHarian::create([
            'depot_id'      => $transaksi->depot_id,
            'tipe'          => 'MASUK',
            'sumber'        => 'PENJUALAN',
            'divisi'        => null,
            'keterangan'    => "Pembayaran {$transaksi->no_faktur} ({$data['tipe']})",
            'jumlah'        => $pembayaran->jumlah,
            'metode'        => $data['metode'],
            'tgl_transaksi' => $data['tgl_bayar'],
            'input_by'      => $request->user()?->id,
            'transaksi_id'  => $transaksi->id,
        ]);
```

The full `store()` method after the change:

```php
    public function store(Request $request, Transaksi $transaksi): JsonResponse
    {
        $data = $request->validate([
            'jumlah'   => ['required', 'integer', 'min:1'],
            'tipe'     => ['required', 'in:DP,PELUNASAN'],
            'metode'   => ['required', 'in:CASH,TRANSFER_BCA,TRANSFER_LAIN'],
            'teller_id'=> ['nullable', 'exists:users,id'],
            'tgl_bayar'=> ['required', 'date'],
            'catatan'  => ['nullable', 'string', 'max:500'],
        ]);

        $pembayaran = Pembayaran::create(array_merge($data, ['transaksi_id' => $transaksi->id]));

        $this->svc->syncStatusBayar($transaksi);

        KasHarian::create([
            'depot_id'      => $transaksi->depot_id,
            'tipe'          => 'MASUK',
            'sumber'        => 'PENJUALAN',
            'divisi'        => null,
            'keterangan'    => "Pembayaran {$transaksi->no_faktur} ({$data['tipe']})",
            'jumlah'        => $pembayaran->jumlah,
            'metode'        => $data['metode'],
            'tgl_transaksi' => $data['tgl_bayar'],
            'input_by'      => $request->user()?->id,
            'transaksi_id'  => $transaksi->id,
        ]);

        return response()->json(['pembayaran' => $pembayaran->load('teller:id,name')], 201);
    }
```

### Step 4: Run auto-kas tests

```bash
cd backend && php artisan test tests/Feature/Keuangan/AutoKasTest.php 2>&1
```

Expected: 3 tests pass.

### Step 5: Run full suite to verify no regressions

```bash
cd backend && php artisan test 2>&1 | tail -5
```

### Step 6: Commit

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/PembayaranController.php \
        backend/tests/Feature/Keuangan/AutoKasTest.php
git commit -m "feat(keuangan): auto-create kas_harian MASUK entry on every POS payment"
```

---

## Task 4: Frontend — SaldoCards component

**Files:**
- Create: `frontend/app/(dashboard)/keuangan/components/SaldoCards.tsx`

### Step 1: Create component

```tsx
// frontend/app/(dashboard)/keuangan/components/SaldoCards.tsx
import { Card } from '@/components/ui/Card'

interface PerMetode {
  metode: string
  masuk: number
  keluar: number
}

interface KasSummary {
  total_masuk: number
  total_keluar: number
  saldo: number
  per_metode: PerMetode[]
}

interface SaldoCardsProps {
  summary: KasSummary
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

export function SaldoCards({ summary }: SaldoCardsProps) {
  return (
    <div className="space-y-4">
      {/* Main summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
            Total Masuk
          </p>
          <p className="font-display font-bold text-2xl text-[#15803d]">
            {rupiah(summary.total_masuk)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
            Total Keluar
          </p>
          <p className="font-display font-bold text-2xl text-error">
            {rupiah(summary.total_keluar)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
            Saldo
          </p>
          <p className={`font-display font-bold text-2xl ${
            summary.saldo >= 0 ? 'text-primary' : 'text-error'
          }`}>
            {rupiah(summary.saldo)}
          </p>
        </Card>
      </div>

      {/* Per-method breakdown */}
      {summary.per_metode.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.per_metode.map((m) => (
            <Card key={m.metode}>
              <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-3">
                {METODE_LABEL[m.metode] ?? m.metode}
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Masuk</span>
                <span className="font-display font-semibold text-[#15803d]">{rupiah(m.masuk)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-on-surface-variant">Keluar</span>
                <span className="font-display font-semibold text-error">{rupiah(m.keluar)}</span>
              </div>
              <div className="border-t border-surface-high mt-2 pt-2 flex justify-between text-sm">
                <span className="text-on-surface-variant font-medium">Saldo</span>
                <span className={`font-display font-semibold ${
                  (m.masuk - m.keluar) >= 0 ? 'text-primary' : 'text-error'
                }`}>{rupiah(m.masuk - m.keluar)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Step 2: Verify TypeScript

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -10
```

### Step 3: Commit

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/keuangan/components/SaldoCards.tsx"
git commit -m "feat(keuangan): add SaldoCards with total masuk/keluar/saldo + per-metode breakdown"
```

---

## Task 5: Frontend — CashFlowChart component

**Files:**
- Create: `frontend/app/(dashboard)/keuangan/components/CashFlowChart.tsx`

### Step 1: Create component

```tsx
// frontend/app/(dashboard)/keuangan/components/CashFlowChart.tsx
'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

interface CashFlowItem {
  tanggal: string
  masuk: number
  keluar: number
}

interface CashFlowChartProps {
  data: CashFlowItem[]
  bulan: string   // 'YYYY-MM'
}

function formatTgl(str: string): string {
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function formatRupiah(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}rb`
  return String(value)
}

export function CashFlowChart({ data, bulan }: CashFlowChartProps) {
  const chartData = data.map((d) => ({ ...d, label: formatTgl(d.tanggal) }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow — {bulan}</CardTitle>
      </CardHeader>
      {data.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-8 text-center">
          Belum ada data bulan ini.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradMasuk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2779a7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2779a7" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradKeluar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ba1a1a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ba1a1a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3f0f8" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#2d4a5e' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatRupiah}
              tick={{ fontSize: 10, fill: '#2d4a5e' }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, '']}
              contentStyle={{
                background: '#fff',
                border: '1px solid #e3f0f8',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Area
              type="monotone"
              dataKey="masuk"
              name="Kas Masuk"
              stroke="#2779a7"
              strokeWidth={2}
              fill="url(#gradMasuk)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="keluar"
              name="Kas Keluar"
              stroke="#ba1a1a"
              strokeWidth={2}
              fill="url(#gradKeluar)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
```

### Step 2: Verify TypeScript

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -10
```

If recharts `Tooltip` formatter type errors, use `(value: unknown)` with a `typeof value === 'number'` guard:

```tsx
formatter={(value: unknown) => {
  const n = typeof value === 'number' ? value : 0
  return [`Rp ${n.toLocaleString('id-ID')}`, '']
}}
```

### Step 3: Commit

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/keuangan/components/CashFlowChart.tsx"
git commit -m "feat(keuangan): add CashFlowChart area chart component"
```

---

## Task 6: Frontend — KasTable + TambahKasModal

**Files:**
- Create: `frontend/app/(dashboard)/keuangan/components/KasTable.tsx`
- Create: `frontend/app/(dashboard)/keuangan/components/TambahKasModal.tsx`

### Step 1: Create KasTable

```tsx
// frontend/app/(dashboard)/keuangan/components/KasTable.tsx
import { Card } from '@/components/ui/Card'

interface KasEntry {
  id: number
  tipe: 'MASUK' | 'KELUAR'
  sumber: string | null
  divisi: string | null
  keterangan: string
  jumlah: number
  metode: string
  tgl_transaksi: string
  input_by: { id: number; name: string } | null
}

interface KasTableProps {
  entries: KasEntry[]
}

const METODE_SHORT: Record<string, string> = {
  CASH:          'Tunai',
  TRANSFER_BCA:  'BCA',
  TRANSFER_LAIN: 'Transfer',
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

function formatTgl(str: string): string {
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function KasTable({ entries }: KasTableProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant text-center py-8">
          Belum ada transaksi untuk filter ini.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Tanggal', 'Keterangan', 'Sumber/Divisi', 'Metode', 'Jumlah'].map((h) => (
                <th key={h} className="text-left pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                <td className="py-2.5 pr-4 font-body text-on-surface-variant whitespace-nowrap">
                  {formatTgl(e.tgl_transaksi)}
                </td>
                <td className="py-2.5 pr-4 font-body text-on-surface max-w-xs truncate">
                  {e.keterangan}
                </td>
                <td className="py-2.5 pr-4 font-body text-on-surface-variant">
                  {e.sumber ?? e.divisi ?? '—'}
                </td>
                <td className="py-2.5 pr-4 font-body text-on-surface-variant">
                  {METODE_SHORT[e.metode] ?? e.metode}
                </td>
                <td className={`py-2.5 font-display font-semibold whitespace-nowrap ${
                  e.tipe === 'MASUK' ? 'text-[#15803d]' : 'text-error'
                }`}>
                  {e.tipe === 'KELUAR' ? '−' : '+'}{rupiah(e.jumlah)}
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

### Step 2: Create TambahKasModal

```tsx
// frontend/app/(dashboard)/keuangan/components/TambahKasModal.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

const SUMBER_OPTIONS = ['PENJUALAN', 'DEPOSIT', 'LAIN']
const DIVISI_OPTIONS = ['KONSTRUKSI', 'LOGISTIK', 'ADMIN', 'CS', 'KANDANG', 'DISTRIBUSI', 'PAKAN', 'LISTRIK', 'LAIN']
const METODE_OPTIONS = [
  { value: 'CASH',          label: 'Tunai' },
  { value: 'TRANSFER_BCA',  label: 'Transfer BCA' },
  { value: 'TRANSFER_LAIN', label: 'Transfer Lain' },
]

interface TambahKasModalProps {
  onDone:  () => void
  onClose: () => void
}

export function TambahKasModal({ onDone, onClose }: TambahKasModalProps) {
  const [form, setForm] = useState({
    tipe:          'MASUK',
    sumber:        'DEPOSIT',
    divisi:        'ADMIN',
    keterangan:    '',
    jumlah:        '',
    metode:        'CASH',
    tgl_transaksi: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit() {
    if (!form.keterangan || !form.jumlah || !form.tgl_transaksi) {
      setError('Keterangan, jumlah, dan tanggal wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/keuangan/kas', {
        tipe:          form.tipe,
        sumber:        form.tipe === 'MASUK'  ? form.sumber : undefined,
        divisi:        form.tipe === 'KELUAR' ? form.divisi : undefined,
        keterangan:    form.keterangan,
        jumlah:        Number(form.jumlah),
        metode:        form.metode,
        tgl_transaksi: form.tgl_transaksi,
      })
      onDone()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Gagal menyimpan.')
      setSaving(false)
    }
  }

  const labelClass = 'text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-1 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-card w-full max-w-md p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-on-surface">Tambah Kas</h2>

        {/* Tipe */}
        <div>
          <label className={labelClass}>Tipe</label>
          <div className="flex gap-2">
            {['MASUK', 'KELUAR'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('tipe', t)}
                className={`flex-1 py-2 rounded-lg text-sm font-body font-medium border transition-colors ${
                  form.tipe === t
                    ? t === 'MASUK'
                      ? 'bg-[#dcfce7] border-[#15803d] text-[#15803d]'
                      : 'bg-[#fee2e2] border-error text-error'
                    : 'border-surface-high text-on-surface-variant hover:bg-surface-low'
                }`}
              >
                {t === 'MASUK' ? 'Kas Masuk' : 'Kas Keluar'}
              </button>
            ))}
          </div>
        </div>

        {/* Sumber or Divisi */}
        {form.tipe === 'MASUK' ? (
          <div>
            <label className={labelClass}>Sumber</label>
            <select
              value={form.sumber}
              onChange={(e) => set('sumber', e.target.value)}
              className="input-field"
            >
              {SUMBER_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className={labelClass}>Divisi</label>
            <select
              value={form.divisi}
              onChange={(e) => set('divisi', e.target.value)}
              className="input-field"
            >
              {DIVISI_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        <Input
          label="Keterangan"
          value={form.keterangan}
          onChange={(e) => set('keterangan', e.target.value)}
          placeholder="Mis. Setoran tunai penjualan sore"
        />

        <Input
          label="Jumlah (Rp)"
          type="number"
          min="1"
          value={form.jumlah}
          onChange={(e) => set('jumlah', e.target.value)}
          placeholder="5000000"
        />

        <div>
          <label className={labelClass}>Metode</label>
          <select
            value={form.metode}
            onChange={(e) => set('metode', e.target.value)}
            className="input-field"
          >
            {METODE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <Input
          label="Tanggal"
          type="date"
          value={form.tgl_transaksi}
          onChange={(e) => set('tgl_transaksi', e.target.value)}
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

### Step 3: Verify TypeScript

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -10
```

### Step 4: Commit

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/keuangan/components/KasTable.tsx" \
        "frontend/app/(dashboard)/keuangan/components/TambahKasModal.tsx"
git commit -m "feat(keuangan): add KasTable and TambahKasModal components"
```

---

## Task 7: Frontend — Wire keuangan page

**Files:**
- Create: `frontend/app/(dashboard)/keuangan/page.tsx`

### Step 1: Create page

```tsx
// frontend/app/(dashboard)/keuangan/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SaldoCards }      from './components/SaldoCards'
import { CashFlowChart }   from './components/CashFlowChart'
import { KasTable }        from './components/KasTable'
import { TambahKasModal }  from './components/TambahKasModal'
import api from '@/lib/api'

interface KasEntry {
  id: number
  tipe: 'MASUK' | 'KELUAR'
  sumber: string | null
  divisi: string | null
  keterangan: string
  jumlah: number
  metode: string
  tgl_transaksi: string
  input_by: { id: number; name: string } | null
}

interface KasSummary {
  total_masuk: number
  total_keluar: number
  saldo: number
  per_metode: Array<{ metode: string; masuk: number; keluar: number }>
}

interface CashFlowItem {
  tanggal: string
  masuk: number
  keluar: number
}

const currentBulan = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

export default function KeuanganPage() {
  const [entries, setEntries]   = useState<KasEntry[]>([])
  const [summary, setSummary]   = useState<KasSummary>({ total_masuk: 0, total_keluar: 0, saldo: 0, per_metode: [] })
  const [cashflow, setCashflow] = useState<CashFlowItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Filters
  const [tglDari, setTglDari]   = useState('')
  const [tglSampai, setTglSampai] = useState('')
  const [divisi, setDivisi]     = useState('')
  const [bulan, setBulan]       = useState(currentBulan)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (tglDari)   params.set('tgl_dari',   tglDari)
      if (tglSampai) params.set('tgl_sampai', tglSampai)
      if (divisi)    params.set('divisi',      divisi)

      const [listRes, cfRes] = await Promise.all([
        api.get(`/api/keuangan/kas?${params}`),
        api.get(`/api/keuangan/cashflow?bulan=${bulan}`),
      ])

      setEntries(listRes.data.entries?.data ?? [])
      setSummary(listRes.data.summary)
      setCashflow(cfRes.data.data ?? [])
    } catch {
      setError('Gagal memuat data keuangan.')
    } finally {
      setLoading(false)
    }
  }, [tglDari, tglSampai, divisi, bulan])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleExport() {
    try {
      const res = await api.get(`/api/keuangan/kas/export?bulan=${bulan}`, { responseType: 'blob' })
      const url  = URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href     = url
      link.download = `kas-${bulan}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Gagal export.')
    }
  }

  const DIVISI_OPTIONS = ['', 'KONSTRUKSI', 'LOGISTIK', 'ADMIN', 'CS', 'KANDANG', 'DISTRIBUSI', 'PAKAN', 'LISTRIK', 'LAIN']

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Keuangan BIOP</h1>
          <p className="text-sm text-on-surface-variant mt-1">Buku kas harian depot</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            Tambah Kas
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-surface rounded-lg">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Dari</label>
          <input
            type="date"
            value={tglDari}
            onChange={(e) => setTglDari(e.target.value)}
            className="input-field text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Sampai</label>
          <input
            type="date"
            value={tglSampai}
            onChange={(e) => setTglSampai(e.target.value)}
            className="input-field text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Divisi</label>
          <select
            value={divisi}
            onChange={(e) => setDivisi(e.target.value)}
            className="input-field text-sm"
          >
            {DIVISI_OPTIONS.map((d) => (
              <option key={d} value={d}>{d || '— Semua —'}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Bulan Chart</label>
          <input
            type="month"
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="input-field text-sm"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && (
        <div className="space-y-6">
          <SaldoCards summary={summary} />
          <CashFlowChart data={cashflow} bulan={bulan} />
          <KasTable entries={entries} />
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <TambahKasModal
          onDone={() => { setShowModal(false); fetchData() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
```

### Step 2: Verify TypeScript

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -10
```

### Step 3: Commit

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/keuangan/page.tsx"
git commit -m "feat(keuangan): wire T-10 keuangan BIOP page with filters, chart, table, modal"
```

---

## Task 8: Smoke test + mark T-10 DONE

**Files:**
- Modify: `docs/tasks/T-10-keuangan-biop.md`
- Modify: `docs/TASKS.md`

### Step 1: Run full backend test suite

```bash
cd backend && php artisan test 2>&1 | tail -10
```

Expected: all tests pass.

### Step 2: TypeScript check

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -5
```

Expected: no output.

### Step 3: Smoke test checklist

With backend on :8000 and frontend on :3000:

- [ ] `/keuangan` loads without errors (KEPALA_DEPOT role)
- [ ] Saldo cards show (all zeros if no data is OK)
- [ ] Cash flow chart renders
- [ ] Filter by date range re-fetches data
- [ ] "Tambah Kas" modal opens and closes
- [ ] Submit a Kas Masuk entry — appears in table, saldo updates
- [ ] Submit a Kas Keluar entry — appears in table, saldo updates
- [ ] Export CSV downloads a file
- [ ] Make a POS payment (via existing POS) — check kas_harian table has auto-entry

### Step 4: Update T-10 status

In `docs/tasks/T-10-keuangan-biop.md`:
- Change `**Status:** \`TODO\`` → `**Status:** \`DONE\``
- Change all `- [ ]` in Acceptance Criteria to `- [x]`

### Step 5: Update TASKS.md

- `T-10` row: `⬜ TODO` → `✅ DONE`
- Phase 2 progress: `1 / 10` → `2 / 10`
- Summary table: Phase 2 Selesai `1→2`, Sisa `9→8`; TOTAL Selesai `9→10`, Sisa `16→15`

### Step 6: Commit + tag

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-10-keuangan-biop.md docs/TASKS.md
git commit -m "docs: mark T-10 Keuangan BIOP as DONE"
git tag t-10-complete
```

---

## Acceptance Criteria Checklist

- [ ] `kas_harian` table created with correct columns
- [ ] `POST /api/keuangan/kas` creates MASUK (requires sumber) and KELUAR (requires divisi)
- [ ] `GET /api/keuangan/kas` scoped to user's depot, filterable by date range + divisi
- [ ] `GET /api/keuangan/kas` response includes `summary.saldo` = total_masuk − total_keluar
- [ ] `GET /api/keuangan/saldo?tgl=` returns cumulative balance up to that date
- [ ] `GET /api/keuangan/cashflow?bulan=` returns daily masuk/keluar aggregation
- [ ] `GET /api/keuangan/kas/export?bulan=` downloads valid CSV
- [ ] Every `POST /api/transaksi/:id/bayar` auto-creates a KasHarian MASUK entry
- [ ] Auto-kas keterangan contains the no_faktur value
- [ ] Auto-kas metode matches the payment metode
- [ ] All backend tests pass (KasTest + AutoKasTest)
- [ ] Frontend `/keuangan` page accessible to KEPALA_DEPOT/ADMIN_KETUA
- [ ] Saldo cards show total masuk, keluar, saldo, per-metode breakdown
- [ ] CashFlowChart renders area chart for selected month
- [ ] KasTable shows entries with +/− coloring
- [ ] TambahKasModal saves new entries and refreshes table
- [ ] Export CSV button downloads file
