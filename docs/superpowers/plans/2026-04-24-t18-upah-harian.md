# T-18 Kalkulasi Upah Harian Otomatis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure daily wage rate per employee, auto-calculate wages from actual attendance (HADIR + TERLAMBAT), show per-employee wage summary, export to CSV.

**Architecture:** New `tarif_upah` table (one row per tarif change per karyawan — effective from berlaku_dari). `SdmController` exposes set-tarif, list-tarif, upah-calculation, and CSV export. Wage calculation: latest tarif where berlaku_dari ≤ tgl_sampai × count(absensi where status IN HADIR/TERLAMBAT AND date in period). "Tidak berlaku surut" enforced by creating new tarif rows instead of updating — old rows stay for historical reference. Frontend `/admin/sdm/upah` with filter + export. Sidebar: `Calculator` icon.

**Tech Stack:** Laravel 11, Next.js 14 App Router, TypeScript, PHPUnit TDD

---

## File Map

### Backend — Create
```
backend/
  database/migrations/2026_04_24_600000_create_tarif_upah_table.php
  app/Models/TarifUpah.php
  app/Http/Controllers/SdmController.php
  tests/Feature/Sdm/SdmTest.php
```

### Backend — Modify
```
backend/routes/api.php
```

### Frontend — Create
```
frontend/app/(dashboard)/admin/sdm/upah/page.tsx
```

### Frontend — Modify
```
frontend/components/shared/Sidebar.tsx  (add Calculator + /admin/sdm/upah)
```

---

## Task 1: Migration + TarifUpah Model

**Files:**
- Create: `backend/database/migrations/2026_04_24_600000_create_tarif_upah_table.php`
- Create: `backend/app/Models/TarifUpah.php`

- [ ] **Step 1: Create migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('tarif_upah', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karyawan_id')->constrained('karyawan')->cascadeOnDelete();
            $table->unsignedInteger('tarif_harian');
            $table->date('berlaku_dari');
            $table->foreignId('dibuat_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tarif_upah');
    }
};
```

Save to `backend/database/migrations/2026_04_24_600000_create_tarif_upah_table.php`.

- [ ] **Step 2: Create TarifUpah model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TarifUpah extends Model
{

    protected $table = 'tarif_upah';

    protected $fillable = ['karyawan_id', 'tarif_harian', 'berlaku_dari', 'dibuat_oleh'];

    protected $casts = [
        'tarif_harian' => 'integer',
        'berlaku_dari' => 'date',
    ];

    public function karyawan(): BelongsTo   { return $this->belongsTo(Karyawan::class); }
    public function dibuatOleh(): BelongsTo { return $this->belongsTo(User::class, 'dibuat_oleh'); }
}
```

Save to `backend/app/Models/TarifUpah.php`.

- [ ] **Step 3: Run migration**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan migrate
```

Expected: `Migrated: 2026_04_24_600000_create_tarif_upah_table`.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/2026_04_24_600000_create_tarif_upah_table.php \
        backend/app/Models/TarifUpah.php
git commit -m "feat(sdm): add tarif_upah migration and TarifUpah model"
```

---

## Task 2: Write Failing SdmTest (TDD)

**Files:**
- Create: `backend/tests/Feature/Sdm/SdmTest.php`

- [ ] **Step 1: Write test file**

```php
<?php

namespace Tests\Feature\Sdm;

use App\Enums\UserRole;
use App\Models\Absensi;
use App\Models\Depot;
use App\Models\Karyawan;
use App\Models\TarifUpah;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SdmTest extends TestCase
{
    use RefreshDatabase;

    private User     $kepala;
    private Depot    $depot;
    private Karyawan $karyawan;
    private int      $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot    = Depot::factory()->create();
        $this->kepala   = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);
        $this->karyawan = Karyawan::create([
            'depot_id' => $this->depot->id,
            'nama'     => 'Ahmad',
            'divisi'   => 'Kandang',
        ]);
    }

    private function makeTarif(int $tarifHarian = 150_000, string $berlakuDari = '2026-04-01'): TarifUpah
    {
        return TarifUpah::create([
            'karyawan_id'  => $this->karyawan->id,
            'tarif_harian' => $tarifHarian,
            'berlaku_dari' => $berlakuDari,
            'dibuat_oleh'  => $this->kepala->id,
        ]);
    }

    private function makeAbsensi(string $tgl, string $status = 'HADIR'): void
    {
        Absensi::create([
            'karyawan_id' => $this->karyawan->id,
            'tgl'         => $tgl,
            'status'      => $status,
        ]);
    }

    // ─── tarif ───────────────────────────────────────────────────────────────

    public function test_kepala_can_set_tarif(): void
    {
        $res = $this->actingAs($this->kepala)->postJson('/api/sdm/tarif', [
            'karyawan_id'  => $this->karyawan->id,
            'tarif_harian' => 150_000,
            'berlaku_dari' => '2026-04-01',
        ]);

        $res->assertCreated()->assertJsonPath('tarif.tarif_harian', 150_000);
        $this->assertDatabaseHas('tarif_upah', ['karyawan_id' => $this->karyawan->id, 'tarif_harian' => 150_000]);
    }

    public function test_set_tarif_validates_required_fields(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/sdm/tarif', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['karyawan_id', 'tarif_harian', 'berlaku_dari']);
    }

    public function test_kepala_can_list_active_tarif(): void
    {
        $this->makeTarif(150_000, '2026-04-01');
        $this->makeTarif(160_000, '2026-04-15'); // newer tarif wins

        $res = $this->actingAs($this->kepala)->getJson('/api/sdm/tarif');

        $res->assertOk()->assertJsonStructure(['data' => [['karyawan_id', 'tarif_harian', 'berlaku_dari', 'karyawan']]]);
        // only latest tarif per karyawan
        $this->assertCount(1, $res->json('data'));
        $this->assertEquals(160_000, $res->json('data.0.tarif_harian'));
    }

    // ─── upah calculation ────────────────────────────────────────────────────

    public function test_upah_calculated_correctly(): void
    {
        $this->makeTarif(150_000, '2026-04-01');
        $this->makeAbsensi('2026-04-01', 'HADIR');
        $this->makeAbsensi('2026-04-02', 'HADIR');
        $this->makeAbsensi('2026-04-03', 'TERLAMBAT'); // counts as hadir
        $this->makeAbsensi('2026-04-04', 'TIDAK_HADIR'); // does NOT count

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/sdm/upah?tgl_dari=2026-04-01&tgl_sampai=2026-04-30');

        $res->assertOk()->assertJsonStructure([
            'data' => [['karyawan_id', 'nama', 'divisi', 'hari_hadir', 'tarif_harian', 'total_upah']],
        ]);

        $row = collect($res->json('data'))->firstWhere('karyawan_id', $this->karyawan->id);
        $this->assertEquals(3,       $row['hari_hadir']);   // HADIR + HADIR + TERLAMBAT
        $this->assertEquals(150_000, $row['tarif_harian']);
        $this->assertEquals(450_000, $row['total_upah']);   // 3 × 150_000
    }

    public function test_upah_uses_tarif_aktif_on_tgl_sampai(): void
    {
        $this->makeTarif(100_000, '2026-03-01'); // old tarif
        $this->makeTarif(200_000, '2026-04-01'); // new tarif

        $this->makeAbsensi('2026-04-01', 'HADIR');

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/sdm/upah?tgl_dari=2026-04-01&tgl_sampai=2026-04-30');

        $row = collect($res->json('data'))->firstWhere('karyawan_id', $this->karyawan->id);
        $this->assertEquals(200_000, $row['tarif_harian']); // new tarif applies
    }

    public function test_upah_scoped_to_own_depot(): void
    {
        $otherDepot    = Depot::factory()->create();
        $otherKaryawan = Karyawan::create(['depot_id' => $otherDepot->id, 'nama' => 'Other', 'divisi' => 'X']);
        TarifUpah::create(['karyawan_id' => $otherKaryawan->id, 'tarif_harian' => 999_000, 'berlaku_dari' => '2026-04-01']);

        $this->makeTarif(150_000, '2026-04-01');
        $this->makeAbsensi('2026-04-01');

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/sdm/upah?tgl_dari=2026-04-01&tgl_sampai=2026-04-30');

        $ids = collect($res->json('data'))->pluck('karyawan_id');
        $this->assertTrue($ids->contains($this->karyawan->id));
        $this->assertFalse($ids->contains($otherKaryawan->id));
    }

    public function test_upah_requires_date_params(): void
    {
        $this->actingAs($this->kepala)->getJson('/api/sdm/upah')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tgl_dari', 'tgl_sampai']);
    }

    // ─── export ──────────────────────────────────────────────────────────────

    public function test_export_returns_csv(): void
    {
        $this->makeTarif(150_000, '2026-04-01');
        $this->makeAbsensi('2026-04-01');

        $res = $this->actingAs($this->kepala)
            ->get('/api/sdm/upah/export?tgl_dari=2026-04-01&tgl_sampai=2026-04-30');

        $res->assertOk();
        $this->assertStringContainsString('text/csv', $res->headers->get('Content-Type'));
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/sdm/tarif')->assertUnauthorized();
        $this->getJson('/api/sdm/upah')->assertUnauthorized();
    }
}
```

Save to `backend/tests/Feature/Sdm/SdmTest.php`.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Sdm/SdmTest.php --no-coverage 2>&1 | tail -10
```

Expected: all FAIL with 404.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/tests/Feature/Sdm/SdmTest.php
git commit -m "test(sdm): add failing SdmTest (TDD)"
```

---

## Task 3: SdmController + Routes

**Files:**
- Create: `backend/app/Http/Controllers/SdmController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write SdmController**

```php
<?php

namespace App\Http\Controllers;

use App\Models\Karyawan;
use App\Models\TarifUpah;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SdmController extends Controller
{
    public function setTarif(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $data = $request->validate([
            'karyawan_id'  => ['required', 'integer', 'exists:karyawan,id'],
            'tarif_harian' => ['required', 'integer', 'min:1'],
            'berlaku_dari' => ['required', 'date'],
        ]);

        // Ensure karyawan belongs to depot
        abort_unless(
            Karyawan::where('id', $data['karyawan_id'])->where('depot_id', $depotId)->exists(),
            403
        );

        $tarif = TarifUpah::create(array_merge($data, ['dibuat_oleh' => $user->id]));

        return response()->json(['tarif' => $tarif->load('karyawan:id,nama,divisi')], 201);
    }

    public function listTarif(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        // Latest tarif per karyawan for this depot
        $subquery = TarifUpah::select('karyawan_id', DB::raw('MAX(berlaku_dari) as max_berlaku'))
            ->whereHas('karyawan', fn($q) => $q->where('depot_id', $depotId))
            ->groupBy('karyawan_id');

        $tarifs = TarifUpah::joinSub($subquery, 'latest', function ($join) {
            $join->on('tarif_upah.karyawan_id', '=', 'latest.karyawan_id')
                 ->on('tarif_upah.berlaku_dari', '=', 'latest.max_berlaku');
        })
        ->with('karyawan:id,nama,divisi')
        ->get();

        return response()->json(['data' => $tarifs]);
    }

    public function upah(Request $request): JsonResponse
    {
        $request->validate([
            'tgl_dari'   => ['required', 'date'],
            'tgl_sampai' => ['required', 'date'],
        ]);

        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        return response()->json(['data' => $this->buildUpah($depotId, $request->tgl_dari, $request->tgl_sampai)]);
    }

    public function export(Request $request): StreamedResponse
    {
        $request->validate([
            'tgl_dari'   => ['required', 'date'],
            'tgl_sampai' => ['required', 'date'],
        ]);

        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $rows     = $this->buildUpah($depotId, $request->tgl_dari, $request->tgl_sampai);
        $filename = "upah-{$request->tgl_dari}-{$request->tgl_sampai}.csv";

        return response()->streamDownload(function () use ($rows) {
            $h = fopen('php://output', 'w');
            fputcsv($h, ['Nama', 'Divisi', 'Hari Hadir', 'Tarif Harian', 'Total Upah']);
            foreach ($rows as $row) {
                fputcsv($h, [
                    $row['nama'],
                    $row['divisi'],
                    $row['hari_hadir'],
                    $row['tarif_harian'],
                    $row['total_upah'],
                ]);
            }
            fclose($h);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function buildUpah(int $depotId, string $tglDari, string $tglSampai): array
    {
        // Get all karyawan for depot
        $karyawanList = Karyawan::where('depot_id', $depotId)->get();

        // Latest tarif per karyawan (berlaku_dari <= tgl_sampai)
        $subquery = TarifUpah::select('karyawan_id', DB::raw('MAX(berlaku_dari) as max_berlaku'))
            ->where('berlaku_dari', '<=', $tglSampai)
            ->groupBy('karyawan_id');

        $tarifs = TarifUpah::joinSub($subquery, 'latest', function ($join) {
            $join->on('tarif_upah.karyawan_id', '=', 'latest.karyawan_id')
                 ->on('tarif_upah.berlaku_dari', '=', 'latest.max_berlaku');
        })
        ->pluck('tarif_harian', 'tarif_upah.karyawan_id');

        // Count hari hadir per karyawan
        $hariHadir = DB::table('absensi')
            ->whereIn('karyawan_id', $karyawanList->pluck('id'))
            ->whereBetween('tgl', [$tglDari, $tglSampai])
            ->whereIn('status', ['HADIR', 'TERLAMBAT'])
            ->select('karyawan_id', DB::raw('COUNT(*) as hari'))
            ->groupBy('karyawan_id')
            ->pluck('hari', 'karyawan_id');

        return $karyawanList->map(function (Karyawan $k) use ($tarifs, $hariHadir): array {
            $tarif  = $tarifs->get($k->id, 0);
            $hari   = (int) $hariHadir->get($k->id, 0);
            return [
                'karyawan_id' => $k->id,
                'nama'        => $k->nama,
                'divisi'      => $k->divisi,
                'hari_hadir'  => $hari,
                'tarif_harian' => (int) $tarif,
                'total_upah'  => $hari * (int) $tarif,
            ];
        })->values()->all();
    }
}
```

Save to `backend/app/Http/Controllers/SdmController.php`.

- [ ] **Step 2: Register routes in `backend/routes/api.php`**

Inside auth:sanctum, add SDM routes. The static `export` route MUST come before `upah`:

```php
// SDM — Upah Harian
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_KETUA')->group(function () {
    Route::post('sdm/tarif',        [\App\Http\Controllers\SdmController::class, 'setTarif']);
    Route::get('sdm/tarif',         [\App\Http\Controllers\SdmController::class, 'listTarif']);
    Route::get('sdm/upah/export',   [\App\Http\Controllers\SdmController::class, 'export']);
    Route::get('sdm/upah',          [\App\Http\Controllers\SdmController::class, 'upah']);
});
```

- [ ] **Step 3: Run tests — expect all 11 green**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Sdm/SdmTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 11 PASS. Fix any failures before continuing.

Note: `test_kepala_can_list_active_tarif` checks `assertCount(1, ...)` — the listTarif endpoint should return only the latest tarif per karyawan. If tests fail with SQL errors, check the joinSub syntax for SQLite compatibility.

If `joinSub` fails on SQLite (Laravel sometimes has issues with subquery joins), replace `listTarif` with:

```php
    public function listTarif(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $karyawanIds = Karyawan::where('depot_id', $depotId)->pluck('id');

        // For each karyawan, get their latest tarif
        $tarifs = TarifUpah::whereIn('karyawan_id', $karyawanIds)
            ->with('karyawan:id,nama,divisi')
            ->get()
            ->groupBy('karyawan_id')
            ->map(fn($group) => $group->sortByDesc('berlaku_dari')->first())
            ->values();

        return response()->json(['data' => $tarifs]);
    }
```

And similarly if `buildUpah` joinSub fails, replace the tarif lookup with:

```php
        // Latest tarif per karyawan (berlaku_dari <= tgl_sampai) — SQLite-safe approach
        $tarifs = collect();
        foreach ($karyawanList as $k) {
            $t = TarifUpah::where('karyawan_id', $k->id)
                ->where('berlaku_dari', '<=', $tglSampai)
                ->orderBy('berlaku_dari', 'desc')
                ->first();
            if ($t) $tarifs->put($k->id, $t->tarif_harian);
        }
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/SdmController.php backend/routes/api.php
git commit -m "feat(sdm): add SdmController + routes (tarif, upah, export)"
```

---

## Task 4: Frontend — Upah Page + Sidebar

**Files:**
- Create: `frontend/app/(dashboard)/admin/sdm/upah/page.tsx`
- Modify: `frontend/components/shared/Sidebar.tsx`

- [ ] **Step 1: Write upah page**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface UpahRow {
  karyawan_id:  number
  nama:         string
  divisi:       string
  hari_hadir:   number
  tarif_harian: number
  total_upah:   number
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

const today     = new Date().toISOString().slice(0, 10)
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

export default function UpahPage() {
  const [rows,     setRows]     = useState<UpahRow[]>([])
  const [tglDari,  setTglDari]  = useState(firstOfMonth)
  const [tglSampai,setTglSampai]= useState(today)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!tglDari || !tglSampai) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/sdm/upah?tgl_dari=${tglDari}&tgl_sampai=${tglSampai}`)
      setRows(res.data.data ?? [])
    } catch {
      setError('Gagal memuat data upah.')
    } finally {
      setLoading(false)
    }
  }, [tglDari, tglSampai])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleExport() {
    try {
      const res = await api.get(
        `/api/sdm/upah/export?tgl_dari=${tglDari}&tgl_sampai=${tglSampai}`,
        { responseType: 'blob' }
      )
      const url  = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const link = document.createElement('a')
      link.href     = url
      link.download = `upah-${tglDari}-${tglSampai}.csv`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch {
      alert('Gagal export.')
    }
  }

  const totalUpah = rows.reduce((sum, r) => sum + r.total_upah, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Kalkulasi Upah Harian</h1>
          <p className="text-sm text-on-surface-variant mt-1">Tarif × hari hadir per karyawan</p>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

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

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <>
          <Card>
            {rows.length === 0 ? (
              <p className="text-center py-8 text-on-surface-variant text-sm">
                Tidak ada data karyawan atau tarif belum dikonfigurasi.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-high">
                      {['Nama', 'Divisi', 'Hari Hadir', 'Tarif Harian', 'Total Upah'].map((h) => (
                        <th key={h} className={`py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest ${
                          ['Hari Hadir', 'Tarif Harian', 'Total Upah'].includes(h) ? 'text-right' : 'text-left'
                        }`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.karyawan_id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                        <td className="py-3 px-4 font-body font-medium text-on-surface">{r.nama}</td>
                        <td className="py-3 px-4 font-body text-on-surface-variant">{r.divisi}</td>
                        <td className="py-3 px-4 font-display text-right text-on-surface">{r.hari_hadir}</td>
                        <td className="py-3 px-4 font-display text-right text-on-surface-variant whitespace-nowrap">
                          {r.tarif_harian > 0 ? rupiah(r.tarif_harian) : <span className="text-xs">— Belum diset —</span>}
                        </td>
                        <td className="py-3 px-4 font-display font-semibold text-right text-primary whitespace-nowrap">
                          {rupiah(r.total_upah)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-surface-low border-t-2 border-surface-high">
                      <td colSpan={4} className="py-3 px-4 font-body font-semibold text-on-surface">Total</td>
                      <td className="py-3 px-4 font-display font-bold text-right text-primary whitespace-nowrap">{rupiah(totalUpah)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/admin/sdm/upah/page.tsx`.

- [ ] **Step 2: Update Sidebar**

In `frontend/components/shared/Sidebar.tsx`, add `Calculator` to lucide-react import (after `MessageSquare`):
```tsx
  ..., MessageSquare, Calculator
```

Add nav item AFTER `/admin/wa-log`:
```tsx
  { href: '/admin/wa-log',    label: 'Log WA',            icon: MessageSquare, roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
  { href: '/admin/sdm/upah',  label: 'Upah Harian',       icon: Calculator,    roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA'] },
```

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output. Fix any errors.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/admin/sdm/upah/page.tsx" frontend/components/shared/Sidebar.tsx
git commit -m "feat(sdm): add upah harian page + sidebar link"
```

---

## Task 5: Verification + Close T-18

**Files:**
- Modify: `docs/tasks/T-18-upah-harian.md`
- Modify: `docs/TASKS.md`

- [ ] **Step 1: Run SdmTest**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Sdm/SdmTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 11 tests PASS.

- [ ] **Step 2: Run full test suite**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test --no-coverage 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -5
```

Expected: no output.

- [ ] **Step 4: Update T-18 task doc**

In `docs/tasks/T-18-upah-harian.md`:
- `**Status:** \`TODO\`` → `**Status:** \`DONE\``
- All `- [ ]` → `- [x]`
- Add to Notes: "Tarif tidak berlaku surut: new tarif entries created with berlaku_dari; latest tarif ≤ tgl_sampai used for calculation. OI-06 (komponen tambahan) still open. Tarif config UI (inline modal) deferred — set tarif via API."

- [ ] **Step 5: Update TASKS.md**

- T-18 row: `⬜ TODO` → `✅ DONE`
- Phase 2 progress: `9 / 10` → `10 / 10` ✅ Phase 2 Complete!
- Summary: Phase 2 Selesai `9→10`, Sisa `1→0`; TOTAL Selesai `17→18`, Sisa `8→7`

- [ ] **Step 6: Commit + tag**

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-18-upah-harian.md docs/TASKS.md
git commit -m "docs: mark T-18 Upah Harian as DONE — Phase 2 complete!"
git tag t-18-complete
```

---

## Acceptance Criteria Checklist

- [ ] Tarif harian per karyawan configurable (POST /sdm/tarif)
- [ ] New tarif row created (old rows preserved — tidak berlaku surut)
- [ ] GET /sdm/tarif returns latest active tarif per karyawan
- [ ] Upah = tarif × hari hadir (HADIR + TERLAMBAT count, TIDAK_HADIR excluded)
- [ ] Date range filter on upah calculation
- [ ] Export CSV with nama/divisi/hari hadir/tarif/total
- [ ] All 11 backend tests pass
- [ ] Full test suite passes
- [ ] TypeScript clean
