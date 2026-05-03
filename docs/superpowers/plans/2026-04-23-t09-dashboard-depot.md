# T-09 Dashboard Depot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time depot dashboard with stok summary, per-kelas breakdown, 7-day sales chart, revenue summary, and low-stock alerts — replacing the existing placeholder dashboard page.

**Architecture:** Single backend endpoint `GET /api/dashboard/depot?musim=` returns all aggregated data in one request. Frontend uses a `useDashboard` hook with 5-minute auto-refresh. Dashboard is scoped to the authenticated user's own depot (KEPALA_DEPOT/ADMIN), with SUPER_ADMIN optionally passing `?depot_id=` to see a specific depot.

**Tech Stack:** Laravel 11 (Eloquent aggregation, DB::raw), PHPUnit (backend TDD), Next.js 14 App Router (Client Components), recharts (line chart), TypeScript

---

## File Map

### Backend — Create
```
backend/
  app/Http/Controllers/DashboardController.php   ← all aggregation logic
  tests/Feature/Dashboard/DashboardTest.php      ← TDD tests
```

### Backend — Modify
```
backend/
  routes/api.php    ← add GET /dashboard/depot
```

### Frontend — Install
```
recharts    ← line chart
```

### Frontend — Create
```
frontend/
  hooks/useDashboard.ts
  app/(dashboard)/dashboard/components/SummaryCards.tsx
  app/(dashboard)/dashboard/components/StokGrid.tsx
  app/(dashboard)/dashboard/components/PenjualanChart.tsx
  app/(dashboard)/dashboard/components/PendapatanSummary.tsx
  app/(dashboard)/dashboard/components/TransaksiTipeCard.tsx
```

### Frontend — Modify
```
frontend/
  app/(dashboard)/dashboard/page.tsx    ← replace placeholder with real dashboard
```

---

## Task 1: Backend — DashboardController (TDD)

**Files:**
- Create: `backend/tests/Feature/Dashboard/DashboardTest.php`
- Create: `backend/app/Http/Controllers/DashboardController.php`
- Modify: `backend/routes/api.php`

### Step 1: Write failing tests

```php
<?php
// backend/tests/Feature/Dashboard/DashboardTest.php

namespace Tests\Feature\Dashboard;

use App\Enums\MetodeBayar;
use App\Enums\StatusHewan;
use App\Enums\TipeBayar;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Depot;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\Pembayaran;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $kepala;
    private Depot $depot;
    private KelasHewan $kelas;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot  = Depot::factory()->create();
        $this->kepala = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);
        $this->kelas = KelasHewan::create(['kode' => 'A1', 'nama' => 'Kelas A1', 'urutan' => 1]);
    }

    private function makeHewan(array $attrs = []): Hewan
    {
        static $seq = 0;
        $seq++;
        return Hewan::create(array_merge([
            'depot_id'      => $this->depot->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'no_hewan'      => str_pad($seq, 3, '0', STR_PAD_LEFT),
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 250,
            'tgl_masuk'     => now()->toDateString(),
            'musim'         => 2026,
            'status'        => 'AVAILABLE',
        ], $attrs));
    }

    private function makePembayaran(Hewan $hewan, int $jumlah, string $tglBayar = null): void
    {
        $customer  = Customer::create(['nama' => 'Test', 'hp' => '08111111111']);
        $transaksi = Transaksi::create([
            'depot_id'         => $this->depot->id,
            'no_faktur'        => 'INV-' . $hewan->no_hewan,
            'hewan_id'         => $hewan->id,
            'customer_id'      => $customer->id,
            'tipe_qurban'      => 'SHQ',
            'jenis'            => 'SAPI',
            'kelas_id'         => $this->kelas->id,
            'harga'            => $jumlah,
            'total'            => $jumlah,
            'musim'            => 2026,
            'status_bayar'     => 'LUNAS',
            'status_transaksi' => 'SELESAI',
        ]);
        Pembayaran::create([
            'transaksi_id' => $transaksi->id,
            'jumlah'       => $jumlah,
            'tipe'         => TipeBayar::PELUNASAN,
            'metode'       => MetodeBayar::CASH,
            'tgl_bayar'    => $tglBayar ?? today()->toDateString(),
        ]);
    }

    public function test_kepala_depot_can_get_dashboard_structure(): void
    {
        $res = $this->actingAs($this->kepala)
            ->getJson('/api/dashboard/depot?musim=2026');

        $res->assertOk()
            ->assertJsonStructure([
                'stok'   => ['masuk', 'tersedia', 'terjual', 'delivered', 'mati', 'per_kelas'],
                'pendapatan' => ['hari_ini', 'musim'],
                'transaksi_hari_ini' => ['total', 'per_tipe'],
                'grafik_7hari',
                'alert_stok',
            ]);
    }

    public function test_stok_counts_are_correct(): void
    {
        $this->makeHewan(['status' => 'AVAILABLE']);
        $this->makeHewan(['status' => 'BOOKED']);
        $this->makeHewan(['status' => 'SOLD']);
        $this->makeHewan(['status' => 'DELIVERED']);
        $this->makeHewan(['status' => 'MATI']);

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/dashboard/depot?musim=2026');

        $res->assertJsonPath('stok.masuk', 5)
            ->assertJsonPath('stok.tersedia', 2)   // AVAILABLE + BOOKED
            ->assertJsonPath('stok.terjual', 2)    // SOLD + DELIVERED
            ->assertJsonPath('stok.delivered', 1)
            ->assertJsonPath('stok.mati', 1);
    }

    public function test_stok_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        $this->makeHewan(); // own depot
        Hewan::create([
            'depot_id'      => $otherDepot->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'no_hewan'      => '999',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 200,
            'tgl_masuk'     => now()->toDateString(),
            'musim'         => 2026,
            'status'        => 'AVAILABLE',
        ]);

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/dashboard/depot?musim=2026');

        $res->assertJsonPath('stok.masuk', 1);
    }

    public function test_pendapatan_hari_ini_sums_todays_payments(): void
    {
        $hewan = $this->makeHewan(['status' => 'SOLD']);
        $this->makePembayaran($hewan, 6_000_000, today()->toDateString());

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/dashboard/depot?musim=2026');

        $res->assertJsonPath('pendapatan.hari_ini', 6_000_000)
            ->assertJsonPath('pendapatan.musim', 6_000_000);
    }

    public function test_pendapatan_musim_excludes_other_musim(): void
    {
        $hewan2025 = Hewan::create([
            'depot_id'      => $this->depot->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'no_hewan'      => '888',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 200,
            'tgl_masuk'     => '2025-04-01',
            'musim'         => 2025,
            'status'        => 'SOLD',
        ]);
        $customer = Customer::create(['nama' => 'Old', 'hp' => '08100000000']);
        $t2025 = Transaksi::create([
            'depot_id' => $this->depot->id, 'no_faktur' => 'INV-2025',
            'hewan_id' => $hewan2025->id, 'customer_id' => $customer->id,
            'tipe_qurban' => 'SHQ', 'jenis' => 'SAPI', 'kelas_id' => $this->kelas->id,
            'harga' => 5_000_000, 'total' => 5_000_000,
            'musim' => 2025, 'status_bayar' => 'LUNAS', 'status_transaksi' => 'SELESAI',
        ]);
        Pembayaran::create([
            'transaksi_id' => $t2025->id, 'jumlah' => 5_000_000,
            'tipe' => TipeBayar::PELUNASAN, 'metode' => MetodeBayar::CASH,
            'tgl_bayar' => today()->toDateString(),
        ]);

        $hewan = $this->makeHewan(['status' => 'SOLD']);
        $this->makePembayaran($hewan, 6_000_000, today()->toDateString());

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/dashboard/depot?musim=2026');

        $res->assertJsonPath('pendapatan.musim', 6_000_000); // excludes 2025 payment
    }

    public function test_grafik_7hari_returns_exactly_7_entries(): void
    {
        $res = $this->actingAs($this->kepala)
            ->getJson('/api/dashboard/depot?musim=2026');

        $this->assertCount(7, $res->json('grafik_7hari'));
    }

    public function test_grafik_7hari_includes_payment_totals(): void
    {
        $hewan = $this->makeHewan(['status' => 'SOLD']);
        $this->makePembayaran($hewan, 3_000_000, today()->toDateString());

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/dashboard/depot?musim=2026');

        $grafik = $res->json('grafik_7hari');
        $today  = collect($grafik)->firstWhere('tanggal', today()->toDateString());

        $this->assertEquals(3_000_000, $today['pendapatan']);
    }

    public function test_alert_stok_flags_kelas_below_threshold(): void
    {
        // 3 AVAILABLE in kelas A1 SAPI — below threshold of 5
        for ($i = 1; $i <= 3; $i++) {
            $this->makeHewan();
        }

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/dashboard/depot?musim=2026');

        $alerts = collect($res->json('alert_stok'));
        $this->assertNotEmpty($alerts);

        $alert = $alerts->firstWhere('kelas_kode', 'A1');
        $this->assertNotNull($alert);
        $this->assertEquals(3, $alert['sisa']);
        $this->assertEquals('SAPI', $alert['jenis']);
    }

    public function test_alert_stok_empty_when_all_kelas_above_threshold(): void
    {
        for ($i = 1; $i <= 6; $i++) {
            $this->makeHewan();
        }

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/dashboard/depot?musim=2026');

        $this->assertEmpty($res->json('alert_stok'));
    }

    public function test_unauthenticated_cannot_access_dashboard(): void
    {
        $this->getJson('/api/dashboard/depot?musim=2026')
            ->assertUnauthorized();
    }
}
```

### Step 2: Run tests — verify they fail

```bash
cd backend
php artisan test tests/Feature/Dashboard/DashboardTest.php
```

Expected: FAIL — `Route [api/dashboard/depot] not defined` or 404.

### Step 3: Create DashboardController

```php
<?php
// backend/app/Http/Controllers/DashboardController.php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Hewan;
use App\Models\Pembayaran;
use App\Models\Transaksi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function depot(Request $request): JsonResponse
    {
        $musim   = (int) $request->input('musim', now()->year);
        $user    = $request->user();
        $depotId = $this->resolveDepotId($user, $request->input('depot_id'));

        return response()->json([
            'stok'               => $this->queryStok($depotId, $musim),
            'pendapatan'         => $this->queryPendapatan($depotId, $musim),
            'transaksi_hari_ini' => $this->queryTransaksiHariIni($depotId),
            'grafik_7hari'       => $this->queryGrafik7Hari($depotId, $musim),
            'alert_stok'         => $this->queryAlertStok($depotId, $musim),
        ]);
    }

    private function resolveDepotId($user, mixed $requested): ?int
    {
        if ($user->role === UserRole::SUPER_ADMIN) {
            return $requested !== null ? (int) $requested : null;
        }
        return $user->depot_id;
    }

    private function queryStok(?int $depotId, int $musim): array
    {
        $base = Hewan::where('musim', $musim);
        if ($depotId !== null) {
            $base->where('depot_id', $depotId);
        }

        $counts = (clone $base)
            ->select('status', DB::raw('count(*) as jumlah'))
            ->groupBy('status')
            ->pluck('jumlah', 'status')
            ->map(fn($v) => (int) $v)
            ->toArray();

        $perKelas = (clone $base)
            ->join('kelas_hewan as kj', 'hewan.kelas_jual_id', '=', 'kj.id')
            ->select(
                'kj.kode as kelas_kode',
                'kj.nama as kelas_nama',
                'hewan.jenis',
                DB::raw("SUM(CASE WHEN hewan.status IN ('AVAILABLE','BOOKED') THEN 1 ELSE 0 END) as tersedia"),
                DB::raw("SUM(CASE WHEN hewan.status IN ('SOLD','DELIVERED') THEN 1 ELSE 0 END) as terjual")
            )
            ->groupBy('kj.kode', 'kj.nama', 'hewan.jenis')
            ->orderBy('kj.kode')
            ->get()
            ->map(fn($row) => [
                'kelas_kode' => $row->kelas_kode,
                'kelas_nama' => $row->kelas_nama,
                'jenis'      => $row->jenis,
                'tersedia'   => (int) $row->tersedia,
                'terjual'    => (int) $row->terjual,
            ])
            ->values()
            ->toArray();

        return [
            'masuk'     => (int) array_sum($counts),
            'tersedia'  => ($counts['AVAILABLE'] ?? 0) + ($counts['BOOKED'] ?? 0),
            'terjual'   => ($counts['SOLD'] ?? 0) + ($counts['DELIVERED'] ?? 0),
            'delivered' => $counts['DELIVERED'] ?? 0,
            'mati'      => $counts['MATI'] ?? 0,
            'per_kelas' => $perKelas,
        ];
    }

    private function queryPendapatan(?int $depotId, int $musim): array
    {
        $base = Pembayaran::query()
            ->join('transaksi', 'pembayaran.transaksi_id', '=', 'transaksi.id')
            ->where('transaksi.musim', $musim);

        if ($depotId !== null) {
            $base->where('transaksi.depot_id', $depotId);
        }

        $hariIni    = (clone $base)->whereDate('pembayaran.tgl_bayar', today())->sum('pembayaran.jumlah');
        $totalMusim = (clone $base)->sum('pembayaran.jumlah');

        return [
            'hari_ini' => (int) $hariIni,
            'musim'    => (int) $totalMusim,
        ];
    }

    private function queryTransaksiHariIni(?int $depotId): array
    {
        $base = Transaksi::whereDate('created_at', today())
            ->where('status_transaksi', '!=', 'DIBATALKAN');

        if ($depotId !== null) {
            $base->where('depot_id', $depotId);
        }

        $total = (clone $base)->count();

        $perTipe = (clone $base)
            ->select('tipe_qurban', DB::raw('count(*) as count'))
            ->groupBy('tipe_qurban')
            ->get()
            ->map(fn($row) => [
                'tipe_qurban' => $row->tipe_qurban,
                'count'       => (int) $row->count,
            ])
            ->values()
            ->toArray();

        return [
            'total'    => $total,
            'per_tipe' => $perTipe,
        ];
    }

    private function queryGrafik7Hari(?int $depotId, int $musim): array
    {
        $startDate = now()->subDays(6)->toDateString();
        $endDate   = now()->toDateString();

        // Pendapatan per day from pembayaran
        $pembayaranBase = Pembayaran::query()
            ->join('transaksi', 'pembayaran.transaksi_id', '=', 'transaksi.id')
            ->where('transaksi.musim', $musim)
            ->whereBetween('pembayaran.tgl_bayar', [$startDate, $endDate]);

        if ($depotId !== null) {
            $pembayaranBase->where('transaksi.depot_id', $depotId);
        }

        $pendapatanByDate = $pembayaranBase
            ->select('pembayaran.tgl_bayar', DB::raw('SUM(pembayaran.jumlah) as total'))
            ->groupBy('pembayaran.tgl_bayar')
            ->pluck('total', 'tgl_bayar')
            ->map(fn($v) => (int) $v)
            ->toArray();

        // Ekor terjual per day from transaksi
        $transaksiBase = Transaksi::query()
            ->where('musim', $musim)
            ->where('status_transaksi', '!=', 'DIBATALKAN')
            ->whereBetween(DB::raw('DATE(created_at)'), [$startDate, $endDate]);

        if ($depotId !== null) {
            $transaksiBase->where('depot_id', $depotId);
        }

        $ekorByDate = $transaksiBase
            ->select(DB::raw('DATE(created_at) as tanggal'), DB::raw('count(*) as ekor'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('ekor', 'tanggal')
            ->map(fn($v) => (int) $v)
            ->toArray();

        $result = [];
        for ($i = 6; $i >= 0; $i--) {
            $date     = now()->subDays($i)->toDateString();
            $result[] = [
                'tanggal'    => $date,
                'pendapatan' => $pendapatanByDate[$date] ?? 0,
                'ekor'       => $ekorByDate[$date] ?? 0,
            ];
        }

        return $result;
    }

    private function queryAlertStok(?int $depotId, int $musim, int $threshold = 5): array
    {
        $base = Hewan::query()
            ->join('kelas_hewan as kj', 'hewan.kelas_jual_id', '=', 'kj.id')
            ->where('hewan.musim', $musim)
            ->whereIn('hewan.status', ['AVAILABLE', 'BOOKED']);

        if ($depotId !== null) {
            $base->where('hewan.depot_id', $depotId);
        }

        return $base
            ->select(
                'kj.kode as kelas_kode',
                'kj.nama as kelas_nama',
                'hewan.jenis',
                DB::raw('count(*) as sisa')
            )
            ->groupBy('kj.kode', 'kj.nama', 'hewan.jenis')
            ->having('sisa', '<', $threshold)
            ->orderBy('sisa')
            ->get()
            ->map(fn($row) => [
                'kelas_kode' => $row->kelas_kode,
                'kelas_nama' => $row->kelas_nama,
                'jenis'      => $row->jenis,
                'sisa'       => (int) $row->sisa,
            ])
            ->values()
            ->toArray();
    }
}
```

### Step 4: Register route in api.php

In `backend/routes/api.php`, after the `auth:sanctum` middleware group opening, add:

```php
// Dashboard
Route::get('dashboard/depot', [\App\Http\Controllers\DashboardController::class, 'depot']);
```

Place it before the `// SUPER_ADMIN only` block, inside the `Route::middleware('auth:sanctum')->group(function () {` block:

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });

    // Dashboard
    Route::get('dashboard/depot', [\App\Http\Controllers\DashboardController::class, 'depot']);

    // SUPER_ADMIN only
    // ... rest unchanged
```

### Step 5: Run tests — verify they pass

```bash
cd backend
php artisan test tests/Feature/Dashboard/DashboardTest.php
```

Expected: 10 tests pass, 0 failures.

If `test_alert_stok_flags_kelas_below_threshold` fails with wrong count, check `$seq` is reset between tests. The `static $seq` in `makeHewan()` persists across tests in the same PHP process — fix by using `rand()` or passing explicit `no_hewan` values via `$attrs`.

If HAVING clause fails, some SQLite versions don't support column aliases in HAVING. Since the project uses PostgreSQL, this is not an issue. If running tests on SQLite (default), add `->havingRaw('count(*) < ?', [$threshold])` instead:

```php
// Replace the having line with:
->havingRaw('count(*) < ?', [$threshold])
```

### Step 6: Run full backend test suite

```bash
php artisan test
```

Expected: All existing tests still pass.

### Step 7: Commit

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/DashboardController.php \
        backend/tests/Feature/Dashboard/DashboardTest.php \
        backend/routes/api.php
git commit -m "feat(dashboard): add DashboardController with stok/pendapatan/grafik/alert aggregation"
```

---

## Task 2: Frontend — Install recharts + useDashboard hook

**Files:**
- Install: `recharts` package
- Create: `frontend/hooks/useDashboard.ts`

### Step 1: Install recharts

```bash
cd frontend
npm install recharts
```

Expected: `recharts` added to `package.json`.

### Step 2: Create useDashboard hook

```typescript
// frontend/hooks/useDashboard.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

export interface StokPerKelas {
  kelas_kode: string
  kelas_nama: string
  jenis: string
  tersedia: number
  terjual: number
}

export interface AlertStok {
  kelas_kode: string
  kelas_nama: string
  jenis: string
  sisa: number
}

export interface GrafikItem {
  tanggal: string
  pendapatan: number
  ekor: number
}

export interface DashboardData {
  stok: {
    masuk: number
    tersedia: number
    terjual: number
    delivered: number
    mati: number
    per_kelas: StokPerKelas[]
  }
  pendapatan: {
    hari_ini: number
    musim: number
  }
  transaksi_hari_ini: {
    total: number
    per_tipe: Array<{ tipe_qurban: string; count: number }>
  }
  grafik_7hari: GrafikItem[]
  alert_stok: AlertStok[]
}

export function useDashboard(musim?: number) {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (musim) params.set('musim', String(musim))
      const res = await api.get<DashboardData>(`/api/dashboard/depot?${params}`)
      setData(res.data)
      setError(null)
    } catch {
      setError('Gagal memuat data dashboard.')
    } finally {
      setLoading(false)
    }
  }, [musim])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchData])

  return { data, loading, error, refresh: fetchData }
}
```

### Step 3: Commit

```bash
cd /c/Users/USER/projects/simhq
git add frontend/package.json frontend/package-lock.json \
        frontend/hooks/useDashboard.ts
git commit -m "feat(dashboard): install recharts + add useDashboard hook with auto-refresh"
```

---

## Task 3: Frontend — SummaryCards component

**Files:**
- Create: `frontend/app/(dashboard)/dashboard/components/SummaryCards.tsx`

### Step 1: Create component

```tsx
// frontend/app/(dashboard)/dashboard/components/SummaryCards.tsx
import { AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { DashboardData, AlertStok } from '@/hooks/useDashboard'

interface SummaryCardsProps {
  stok: DashboardData['stok']
  alertStok: AlertStok[]
}

const stat = (label: string, value: number, colorClass: string, sub?: string) => (
  <Card key={label}>
    <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
      {label}
    </p>
    <p className={`font-display font-bold text-3xl ${colorClass}`}>{value.toLocaleString('id-ID')}</p>
    {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
  </Card>
)

export function SummaryCards({ stok, alertStok }: SummaryCardsProps) {
  return (
    <div className="space-y-4">
      {alertStok.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-[#fef9c3] border border-[#fde047] rounded-lg">
          <AlertTriangle className="w-4 h-4 text-[#854d0e] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-body font-medium text-[#854d0e]">Stok Rendah</p>
            <ul className="mt-1 space-y-0.5">
              {alertStok.map((a) => (
                <li key={`${a.kelas_kode}-${a.jenis}`} className="text-xs text-[#713f12]">
                  {a.kelas_nama} ({a.jenis}): {a.sisa} ekor tersisa
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stat('Total Masuk',  stok.masuk,     'text-on-surface', 'ekor musim ini')}
        {stat('Tersedia',     stok.tersedia,  'text-primary',    'AVAILABLE + BOOKED')}
        {stat('Terjual',      stok.terjual,   'text-[#15803d]',  'SOLD + DELIVERED')}
        {stat('Mati',         stok.mati,      'text-error',      'total musim ini')}
      </div>
    </div>
  )
}
```

### Step 2: Commit

```bash
cd /c/Users/USER/projects/simhq
git add frontend/app/\(dashboard\)/dashboard/components/SummaryCards.tsx
git commit -m "feat(dashboard): add SummaryCards component with low-stock alert banner"
```

---

## Task 4: Frontend — StokGrid component

**Files:**
- Create: `frontend/app/(dashboard)/dashboard/components/StokGrid.tsx`

### Step 1: Create component

```tsx
// frontend/app/(dashboard)/dashboard/components/StokGrid.tsx
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { StokPerKelas } from '@/hooks/useDashboard'

interface StokGridProps {
  perKelas: StokPerKelas[]
}

export function StokGrid({ perKelas }: StokGridProps) {
  if (perKelas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stok per Kelas</CardTitle>
        </CardHeader>
        <p className="text-sm text-on-surface-variant">Belum ada data stok.</p>
      </Card>
    )
  }

  // Group by jenis: SAPI first, then DOMBA
  const jenisList = [...new Set(perKelas.map((k) => k.jenis))].sort()
  const kelasList = [...new Set(perKelas.map((k) => k.kelas_kode))].sort()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stok per Kelas</CardTitle>
      </CardHeader>

      {jenisList.map((jenis) => {
        const rows = perKelas.filter((k) => k.jenis === jenis)
        if (rows.length === 0) return null

        return (
          <div key={jenis} className="mb-6 last:mb-0">
            <p className="text-xs font-body font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              {jenis}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left pb-2 pr-6 text-xs text-on-surface-variant font-body">Kelas</th>
                    <th className="text-right pb-2 pr-6 text-xs text-on-surface-variant font-body">Tersedia</th>
                    <th className="text-right pb-2 text-xs text-on-surface-variant font-body">Terjual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-high">
                  {rows.map((row) => (
                    <tr key={row.kelas_kode}>
                      <td className="py-2 pr-6 font-body font-medium text-on-surface">
                        {row.kelas_nama}
                      </td>
                      <td className="py-2 pr-6 text-right">
                        <span className={`font-display font-semibold ${
                          row.tersedia < 5 ? 'text-[#854d0e]' : 'text-primary'
                        }`}>
                          {row.tersedia}
                        </span>
                      </td>
                      <td className="py-2 text-right font-display font-semibold text-[#15803d]">
                        {row.terjual}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </Card>
  )
}
```

### Step 2: Commit

```bash
cd /c/Users/USER/projects/simhq
git add frontend/app/\(dashboard\)/dashboard/components/StokGrid.tsx
git commit -m "feat(dashboard): add StokGrid component with kelas × jenis breakdown"
```

---

## Task 5: Frontend — PenjualanChart component

**Files:**
- Create: `frontend/app/(dashboard)/dashboard/components/PenjualanChart.tsx`

### Step 1: Create component

```tsx
// frontend/app/(dashboard)/dashboard/components/PenjualanChart.tsx
'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { GrafikItem } from '@/hooks/useDashboard'

interface PenjualanChartProps {
  grafik: GrafikItem[]
}

function formatTanggal(str: string): string {
  const d = new Date(str)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function formatRupiah(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}rb`
  return String(value)
}

export function PenjualanChart({ grafik }: PenjualanChartProps) {
  const data = grafik.map((g) => ({
    ...g,
    label: formatTanggal(g.tanggal),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Penjualan 7 Hari Terakhir</CardTitle>
      </CardHeader>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3f0f8" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#2d4a5e' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="pendapatan"
            orientation="left"
            tickFormatter={formatRupiah}
            tick={{ fontSize: 11, fill: '#2d4a5e' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <YAxis
            yAxisId="ekor"
            orientation="right"
            tick={{ fontSize: 11, fill: '#2d4a5e' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'Pendapatan') return [`Rp ${value.toLocaleString('id-ID')}`, name]
              return [value, name]
            }}
            contentStyle={{
              background: '#fff',
              border: '1px solid #e3f0f8',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Line
            yAxisId="pendapatan"
            type="monotone"
            dataKey="pendapatan"
            name="Pendapatan"
            stroke="#2779a7"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="ekor"
            type="monotone"
            dataKey="ekor"
            name="Ekor Terjual"
            stroke="#ECD06F"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
```

### Step 2: Commit

```bash
cd /c/Users/USER/projects/simhq
git add frontend/app/\(dashboard\)/dashboard/components/PenjualanChart.tsx
git commit -m "feat(dashboard): add PenjualanChart 7-day recharts line chart"
```

---

## Task 6: Frontend — PendapatanSummary + TransaksiTipeCard

**Files:**
- Create: `frontend/app/(dashboard)/dashboard/components/PendapatanSummary.tsx`
- Create: `frontend/app/(dashboard)/dashboard/components/TransaksiTipeCard.tsx`

### Step 1: Create PendapatanSummary

```tsx
// frontend/app/(dashboard)/dashboard/components/PendapatanSummary.tsx
import { Card } from '@/components/ui/Card'
import type { DashboardData } from '@/hooks/useDashboard'

interface PendapatanSummaryProps {
  pendapatan: DashboardData['pendapatan']
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)
}

export function PendapatanSummary({ pendapatan }: PendapatanSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Pendapatan Hari Ini
        </p>
        <p className="font-display font-bold text-2xl text-primary">
          {rupiah(pendapatan.hari_ini)}
        </p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Total Pendapatan Musim
        </p>
        <p className="font-display font-bold text-2xl text-on-surface">
          {rupiah(pendapatan.musim)}
        </p>
      </Card>
    </div>
  )
}
```

### Step 2: Create TransaksiTipeCard

```tsx
// frontend/app/(dashboard)/dashboard/components/TransaksiTipeCard.tsx
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { DashboardData } from '@/hooks/useDashboard'

interface TransaksiTipeCardProps {
  transaksiHariIni: DashboardData['transaksi_hari_ini']
}

const TIPE_LABEL: Record<string, string> = {
  SHQ: 'Satu Hewan Qurban',
  THQ: 'Tujuh Hewan Qurban',
  PHQ: 'Per Hewan Qurban',
}

export function TransaksiTipeCard({ transaksiHariIni }: TransaksiTipeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaksi Hari Ini</CardTitle>
      </CardHeader>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="font-display font-bold text-3xl text-on-surface">
          {transaksiHariIni.total}
        </span>
        <span className="text-sm text-on-surface-variant">transaksi</span>
      </div>

      {transaksiHariIni.per_tipe.length > 0 ? (
        <div className="space-y-2">
          {transaksiHariIni.per_tipe.map((t) => (
            <div key={t.tipe_qurban} className="flex items-center justify-between">
              <span className="text-sm font-body text-on-surface-variant">
                {TIPE_LABEL[t.tipe_qurban] ?? t.tipe_qurban}
              </span>
              <span className="font-display font-semibold text-sm text-on-surface">
                {t.count}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">Belum ada transaksi hari ini.</p>
      )}
    </Card>
  )
}
```

### Step 3: Commit

```bash
cd /c/Users/USER/projects/simhq
git add frontend/app/\(dashboard\)/dashboard/components/PendapatanSummary.tsx \
        frontend/app/\(dashboard\)/dashboard/components/TransaksiTipeCard.tsx
git commit -m "feat(dashboard): add PendapatanSummary and TransaksiTipeCard components"
```

---

## Task 7: Frontend — Wire dashboard page

**Files:**
- Modify: `frontend/app/(dashboard)/dashboard/page.tsx`

### Step 1: Replace dashboard page

Replace the entire content of `frontend/app/(dashboard)/dashboard/page.tsx`:

```tsx
// frontend/app/(dashboard)/dashboard/page.tsx
'use client'

import { RefreshCw } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { SummaryCards }      from './components/SummaryCards'
import { StokGrid }          from './components/StokGrid'
import { PenjualanChart }    from './components/PenjualanChart'
import { PendapatanSummary } from './components/PendapatanSummary'
import { TransaksiTipeCard } from './components/TransaksiTipeCard'

const MUSIM = new Date().getFullYear()

export default function DashboardPage() {
  const { data, loading, error, refresh } = useDashboard(MUSIM)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Dashboard</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Musim {MUSIM} — auto-refresh setiap 5 menit
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body text-primary
                     hover:bg-surface-high transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Dashboard content */}
      {data && (
        <div className="space-y-6">
          {/* Row 1: Summary cards + alert */}
          <SummaryCards stok={data.stok} alertStok={data.alert_stok} />

          {/* Row 2: Pendapatan */}
          <PendapatanSummary pendapatan={data.pendapatan} />

          {/* Row 3: Chart + Transaksi tipe */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PenjualanChart grafik={data.grafik_7hari} />
            </div>
            <div>
              <TransaksiTipeCard transaksiHariIni={data.transaksi_hari_ini} />
            </div>
          </div>

          {/* Row 4: Stok per kelas */}
          <StokGrid perKelas={data.stok.per_kelas} />
        </div>
      )}
    </div>
  )
}
```

### Step 2: Commit

```bash
cd /c/Users/USER/projects/simhq
git add frontend/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat(dashboard): wire T-09 dashboard page with all components"
```

---

## Task 8: Smoke Test + Mark T-09 DONE

**Files:**
- Modify: `docs/tasks/T-09-dashboard-depot.md`
- Modify: `docs/TASKS.md`

### Step 1: Start backend (if not running)

```bash
cd backend
php artisan serve --port=8000
```

### Step 2: Start frontend (if not running)

```bash
cd frontend
npm run dev -- --port 3000
```

### Step 3: Smoke test checklist

Open `http://localhost:3000/dashboard` as KEPALA_DEPOT.

- [ ] Page loads without errors (check browser console)
- [ ] 4 summary cards show (Total Masuk / Tersedia / Terjual / Mati)
- [ ] Pendapatan cards show (hari ini + musim total)
- [ ] Chart renders with 7 data points (even if all zero)
- [ ] Transaksi hari ini card shows count + per-tipe breakdown (or "Belum ada" if empty)
- [ ] Stok per kelas table renders (or "Belum ada" if no hewan)
- [ ] Refresh button spins and re-fetches
- [ ] If a kelas has < 5 available hewan, alert banner appears at top
- [ ] Check Network tab: `GET /api/dashboard/depot?musim=2026` returns 200 with correct structure

### Step 4: Run backend tests

```bash
cd backend
php artisan test
```

Expected: All tests pass.

### Step 5: Update T-09 task status

In `docs/tasks/T-09-dashboard-depot.md`, change:
```
**Status:** `TODO`
```
to:
```
**Status:** `DONE`
```

### Step 6: Update TASKS.md

In `docs/TASKS.md`, change:
```
| [T-09](tasks/T-09-dashboard-depot.md) | Dashboard Depot (Stok, Penjualan) | `⬜ TODO` |
```
to:
```
| [T-09](tasks/T-09-dashboard-depot.md) | Dashboard Depot (Stok, Penjualan) | `✅ DONE` |
```

Also update progress line:
```
**Progress Phase 2:** 0 / 10 selesai ⬜
```
to:
```
**Progress Phase 2:** 1 / 10 selesai 🔄
```

### Step 7: Final commit

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-09-dashboard-depot.md docs/TASKS.md
git commit -m "docs: mark T-09 Dashboard Depot as DONE"
git tag t-09-complete
```

---

## Acceptance Criteria Checklist

- [ ] `GET /api/dashboard/depot?musim=2026` returns `{stok, pendapatan, transaksi_hari_ini, grafik_7hari, alert_stok}`
- [ ] `stok.masuk` = total hewan entered this musim for this depot
- [ ] `stok.tersedia` = AVAILABLE + BOOKED count
- [ ] `stok.terjual` = SOLD + DELIVERED count
- [ ] `stok.per_kelas` = breakdown per kelas × jenis
- [ ] `pendapatan.hari_ini` = SUM of pembayaran.jumlah where tgl_bayar = today
- [ ] `pendapatan.musim` = SUM of all pembayaran for this musim
- [ ] `grafik_7hari` = array of exactly 7 objects `{tanggal, pendapatan, ekor}`
- [ ] `alert_stok` = kelas×jenis where AVAILABLE+BOOKED < 5
- [ ] Data scoped to own depot for KEPALA_DEPOT/ADMIN
- [ ] SUPER_ADMIN can pass `?depot_id=X` to scope to a specific depot
- [ ] Dashboard page auto-refreshes every 5 minutes
- [ ] Manual refresh button works
- [ ] Low-stock alert banner shown when `alert_stok` not empty
- [ ] All 10 DashboardTest tests pass
