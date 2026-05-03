# T-13 Income Statement Otomatis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-generate income statement from existing data — revenue per kelas×jenis (from Transaksi), HPP (from HargaKelas), operating costs (from RealisasiPengeluaran), with CSV export and browser-print PDF.

**Architecture:** Read-only controller — no new tables. `IncomeStatementController::generate()` runs two raw DB queries: (1) groups Transaksi[DIKONFIRMASI/SELESAI] by kelas×jenis, joins HargaKelas for harga_beli (HPP); (2) groups RealisasiPengeluaran by RAB.divisi. A shared private `buildData()` method feeds both `generate()` and `export()` (CSV). Frontend `/laporan/income-statement` has 3 summary cards, 2 tables (pendapatan per kelas, biaya per divisi), musim filter, and Export CSV + Cetak PDF buttons. PDF uses `window.print()`.

**Tech Stack:** Laravel 11 (DB query builder, StreamedResponse, RefreshDatabase), Next.js 14 App Router (Client Component), TypeScript, PHPUnit TDD

---

## File Map

### Backend — Create
```
backend/
  app/Http/Controllers/IncomeStatementController.php
  tests/Feature/Laporan/IncomeStatementTest.php
```

### Backend — Modify
```
backend/routes/api.php  (add 2 income-statement routes in laporan section)
```

### Frontend — Create
```
frontend/app/(dashboard)/laporan/income-statement/
  page.tsx
  components/
    SummaryCards.tsx
    PendapatanTable.tsx
    BiayaTable.tsx
```

### Frontend — Modify
```
frontend/components/shared/Sidebar.tsx  (add TrendingUp + /laporan/income-statement nav item)
```

---

## Task 1: Write Failing IncomeStatementTest (TDD)

**Files:**
- Create: `backend/tests/Feature/Laporan/IncomeStatementTest.php`

- [ ] **Step 1: Write test file**

```php
<?php

namespace Tests\Feature\Laporan;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Depot;
use App\Models\HargaKelas;
use App\Models\KelasHewan;
use App\Models\Rab;
use App\Models\RealisasiPengeluaran;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IncomeStatementTest extends TestCase
{
    use RefreshDatabase;

    private User     $kepala;
    private Depot    $depot;
    private int      $musim = 2026;
    private KelasHewan $kelas;
    private Customer $customer;
    private int      $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->depot    = Depot::factory()->create();
        $this->kepala   = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);
        $this->kelas    = KelasHewan::create(['kode' => 'A', 'nama' => 'Kelas A', 'urutan' => 1]);
        $this->customer = Customer::create(['nama' => 'Test Customer']);

        HargaKelas::create([
            'depot_id'   => $this->depot->id,
            'kelas_id'   => $this->kelas->id,
            'jenis'      => 'SAPI',
            'musim'      => $this->musim,
            'harga_beli' => 8_000_000,
            'harga_jual' => 10_000_000,
        ]);
    }

    private function makeTransaksi(array $attrs = []): Transaksi
    {
        $this->seq++;
        return Transaksi::create(array_merge([
            'depot_id'         => $this->depot->id,
            'no_faktur'        => "FAK-{$this->seq}",
            'customer_id'      => $this->customer->id,
            'tipe_qurban'      => 'SHQ',
            'jenis'            => 'SAPI',
            'kelas_id'         => $this->kelas->id,
            'harga'            => 10_000_000,
            'total'            => 10_000_000,
            'status_transaksi' => 'SELESAI',
            'musim'            => $this->musim,
        ], $attrs));
    }

    private function makeRealisasi(string $divisi = 'LOGISTIK', int $jumlah = 2_000_000): void
    {
        $rab = Rab::create([
            'depot_id'        => $this->depot->id,
            'divisi'          => $divisi,
            'musim'           => $this->musim,
            'jumlah_anggaran' => 5_000_000,
            'created_by'      => $this->kepala->id,
        ]);
        RealisasiPengeluaran::create([
            'rab_id'          => $rab->id,
            'keterangan'      => 'Pengeluaran ' . $divisi,
            'jumlah'          => $jumlah,
            'tgl_pengeluaran' => today()->toDateString(),
            'input_by'        => $this->kepala->id,
        ]);
    }

    // ─── generate ────────────────────────────────────────────────────────────

    public function test_generate_returns_correct_structure(): void
    {
        $this->makeTransaksi();

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/laporan/income-statement?musim={$this->musim}");

        $res->assertOk()
            ->assertJsonStructure([
                'musim',
                'pendapatan_kelas' => [['kelas', 'jenis', 'qty', 'pendapatan', 'harga_beli', 'hpp', 'margin_bruto']],
                'total_pendapatan',
                'total_hpp',
                'margin_bruto',
                'biaya_divisi',
                'total_biaya',
                'laba_bersih',
            ]);

        $this->assertEquals($this->musim, $res->json('musim'));
    }

    public function test_generate_computes_pendapatan_correctly(): void
    {
        // 2 transaksi × 10M = 20M pendapatan, 2 × 8M HPP = 16M, margin = 4M
        $this->makeTransaksi(['harga' => 10_000_000]);
        $this->makeTransaksi(['harga' => 10_000_000]);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/laporan/income-statement?musim={$this->musim}");

        $row = collect($res->json('pendapatan_kelas'))->first();

        $this->assertEquals(2,          $row['qty']);
        $this->assertEquals(20_000_000, $row['pendapatan']);
        $this->assertEquals(8_000_000,  $row['harga_beli']);
        $this->assertEquals(16_000_000, $row['hpp']);
        $this->assertEquals(4_000_000,  $row['margin_bruto']);

        $this->assertEquals(20_000_000, $res->json('total_pendapatan'));
        $this->assertEquals(16_000_000, $res->json('total_hpp'));
        $this->assertEquals(4_000_000,  $res->json('margin_bruto'));
    }

    public function test_generate_computes_biaya_and_laba_correctly(): void
    {
        $this->makeTransaksi(['harga' => 10_000_000]);
        $this->makeRealisasi('LOGISTIK', 2_000_000);
        $this->makeRealisasi('ADMIN',    1_000_000);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/laporan/income-statement?musim={$this->musim}");

        $biaya = collect($res->json('biaya_divisi'));
        $this->assertCount(2, $biaya);

        // laba_bersih = margin_bruto (10M-8M=2M) - total_biaya (2M+1M=3M) = -1M
        $this->assertEquals(3_000_000,  $res->json('total_biaya'));
        $this->assertEquals(-1_000_000, $res->json('laba_bersih'));
    }

    public function test_generate_excludes_dibatalkan_transaksi(): void
    {
        $this->makeTransaksi(['status_transaksi' => 'SELESAI']);
        $this->makeTransaksi(['status_transaksi' => 'DIBATALKAN']);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/laporan/income-statement?musim={$this->musim}");

        $row = collect($res->json('pendapatan_kelas'))->first();
        $this->assertEquals(1, $row['qty']); // only the SELESAI one
    }

    public function test_generate_includes_dikonfirmasi_transaksi(): void
    {
        $this->makeTransaksi(['status_transaksi' => 'DIKONFIRMASI', 'harga' => 10_000_000]);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/laporan/income-statement?musim={$this->musim}");

        $this->assertEquals(1, collect($res->json('pendapatan_kelas'))->sum('qty'));
    }

    public function test_generate_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        Transaksi::create([
            'depot_id' => $otherDepot->id, 'no_faktur' => 'FAK-OTHER',
            'customer_id' => $this->customer->id, 'tipe_qurban' => 'SHQ',
            'jenis' => 'SAPI', 'kelas_id' => $this->kelas->id,
            'harga' => 99_000_000, 'total' => 99_000_000,
            'status_transaksi' => 'SELESAI', 'musim' => $this->musim,
        ]);
        $this->makeTransaksi(['harga' => 10_000_000]);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/laporan/income-statement?musim={$this->musim}");

        $this->assertEquals(10_000_000, $res->json('total_pendapatan'));
    }

    public function test_generate_returns_empty_when_no_data(): void
    {
        $res = $this->actingAs($this->kepala)
            ->getJson("/api/laporan/income-statement?musim={$this->musim}");

        $res->assertOk();
        $this->assertCount(0, $res->json('pendapatan_kelas'));
        $this->assertEquals(0, $res->json('total_pendapatan'));
        $this->assertEquals(0, $res->json('laba_bersih'));
    }

    // ─── export ──────────────────────────────────────────────────────────────

    public function test_export_returns_csv(): void
    {
        $this->makeTransaksi();

        $res = $this->actingAs($this->kepala)
            ->get("/api/laporan/income-statement/export?musim={$this->musim}");

        $res->assertOk();
        $this->assertStringContainsString('text/csv', $res->headers->get('Content-Type'));
        $this->assertStringContainsString('income-statement', $res->headers->get('Content-Disposition'));
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/laporan/income-statement')->assertUnauthorized();
    }
}
```

Save to `backend/tests/Feature/Laporan/IncomeStatementTest.php`.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Laporan/IncomeStatementTest.php --no-coverage 2>&1 | tail -10
```

Expected: all tests FAIL with 404.

- [ ] **Step 3: Commit failing tests**

```bash
cd /c/Users/USER/projects/simhq
git add backend/tests/Feature/Laporan/IncomeStatementTest.php
git commit -m "test(income-statement): add failing IncomeStatementTest (TDD)"
```

---

## Task 2: IncomeStatementController + Routes

**Files:**
- Create: `backend/app/Http/Controllers/IncomeStatementController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write controller**

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IncomeStatementController extends Controller
{
    public function generate(Request $request): JsonResponse
    {
        return response()->json($this->buildData($request));
    }

    public function export(Request $request): StreamedResponse
    {
        $data     = $this->buildData($request);
        $filename = "income-statement-{$data['musim']}.csv";

        return response()->streamDownload(function () use ($data) {
            $h = fopen('php://output', 'w');

            fputcsv($h, ['PENDAPATAN PER KELAS']);
            fputcsv($h, ['Kelas', 'Jenis', 'Qty', 'Pendapatan', 'HPP', 'Margin Bruto']);
            foreach ($data['pendapatan_kelas'] as $row) {
                fputcsv($h, [
                    $row['kelas'], $row['jenis'], $row['qty'],
                    $row['pendapatan'], $row['hpp'], $row['margin_bruto'],
                ]);
            }
            fputcsv($h, []);
            fputcsv($h, ['Total Pendapatan', '', '', $data['total_pendapatan']]);
            fputcsv($h, ['Total HPP',        '', '', $data['total_hpp']]);
            fputcsv($h, ['Margin Bruto',     '', '', $data['margin_bruto']]);
            fputcsv($h, []);

            fputcsv($h, ['BIAYA OPERASIONAL PER DIVISI']);
            fputcsv($h, ['Divisi', 'Total Biaya']);
            foreach ($data['biaya_divisi'] as $row) {
                fputcsv($h, [$row['divisi'], $row['total_biaya']]);
            }
            fputcsv($h, []);
            fputcsv($h, ['Total Biaya', $data['total_biaya']]);
            fputcsv($h, []);
            fputcsv($h, ['LABA BERSIH', $data['laba_bersih']]);

            fclose($h);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function buildData(Request $request): array
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;
        $musim   = (int) $request->input('musim', date('Y'));

        $pendapatanKelas = DB::table('transaksi as t')
            ->join('kelas_hewan as kh', 'kh.id', '=', 't.kelas_id')
            ->leftJoin('harga_kelas as hk', function ($join) {
                $join->on('hk.kelas_id', '=', 't.kelas_id')
                     ->on('hk.jenis', '=', 't.jenis')
                     ->on('hk.musim', '=', 't.musim')
                     ->on('hk.depot_id', '=', 't.depot_id');
            })
            ->where('t.depot_id', $depotId)
            ->where('t.musim', $musim)
            ->whereIn('t.status_transaksi', ['DIKONFIRMASI', 'SELESAI'])
            ->groupBy('kh.id', 'kh.nama', 't.jenis', 'hk.harga_beli')
            ->orderBy('kh.nama')
            ->orderBy('t.jenis')
            ->select(
                'kh.nama as kelas',
                't.jenis',
                DB::raw('COUNT(t.id) as qty'),
                DB::raw('SUM(t.harga) as pendapatan'),
                DB::raw('COALESCE(hk.harga_beli, 0) as harga_beli'),
                DB::raw('COUNT(t.id) * COALESCE(hk.harga_beli, 0) as hpp'),
                DB::raw('SUM(t.harga) - COUNT(t.id) * COALESCE(hk.harga_beli, 0) as margin_bruto'),
            )
            ->get()
            ->map(fn($r) => [
                'kelas'        => $r->kelas,
                'jenis'        => $r->jenis,
                'qty'          => (int) $r->qty,
                'pendapatan'   => (int) $r->pendapatan,
                'harga_beli'   => (int) $r->harga_beli,
                'hpp'          => (int) $r->hpp,
                'margin_bruto' => (int) $r->margin_bruto,
            ]);

        $biayaDivisi = DB::table('realisasi_pengeluaran as rp')
            ->join('rab as r', 'r.id', '=', 'rp.rab_id')
            ->where('r.depot_id', $depotId)
            ->where('r.musim', $musim)
            ->groupBy('r.divisi')
            ->orderBy('r.divisi')
            ->select('r.divisi', DB::raw('SUM(rp.jumlah) as total_biaya'))
            ->get()
            ->map(fn($r) => [
                'divisi'      => $r->divisi,
                'total_biaya' => (int) $r->total_biaya,
            ]);

        $totalPendapatan = (int) $pendapatanKelas->sum('pendapatan');
        $totalHPP        = (int) $pendapatanKelas->sum('hpp');
        $marginBruto     = $totalPendapatan - $totalHPP;
        $totalBiaya      = (int) $biayaDivisi->sum('total_biaya');
        $labaBersih      = $marginBruto - $totalBiaya;

        return [
            'musim'            => $musim,
            'pendapatan_kelas' => $pendapatanKelas->values()->all(),
            'total_pendapatan' => $totalPendapatan,
            'total_hpp'        => $totalHPP,
            'margin_bruto'     => $marginBruto,
            'biaya_divisi'     => $biayaDivisi->values()->all(),
            'total_biaya'      => $totalBiaya,
            'laba_bersih'      => $labaBersih,
        ];
    }
}
```

Save to `backend/app/Http/Controllers/IncomeStatementController.php`.

- [ ] **Step 2: Register routes in `backend/routes/api.php`**

The `laporan/rekap-setoran` route already exists. Add the income statement routes in the same laporan section. The `export` static route MUST come before the collection route:

```php
// Laporan
Route::get('laporan/rekap-setoran',              [PembayaranController::class,        'rekapSetoran']);
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_KETUA')->group(function () {
    Route::get('laporan/income-statement/export', [\App\Http\Controllers\IncomeStatementController::class, 'export']);
    Route::get('laporan/income-statement',         [\App\Http\Controllers\IncomeStatementController::class, 'generate']);
});
```

- [ ] **Step 3: Run tests — expect all green**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Laporan/IncomeStatementTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 9 tests PASS. If any fail, read the error and fix before continuing.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/IncomeStatementController.php backend/routes/api.php
git commit -m "feat(income-statement): add IncomeStatementController + routes"
```

---

## Task 3: Frontend — SummaryCards + PendapatanTable + BiayaTable

**Files:**
- Create: `frontend/app/(dashboard)/laporan/income-statement/components/SummaryCards.tsx`
- Create: `frontend/app/(dashboard)/laporan/income-statement/components/PendapatanTable.tsx`
- Create: `frontend/app/(dashboard)/laporan/income-statement/components/BiayaTable.tsx`

- [ ] **Step 1: Write SummaryCards**

```tsx
import { Card } from '@/components/ui/Card'

interface SummaryCardsProps {
  totalPendapatan: number
  totalHPP:        number
  marginBruto:     number
  totalBiaya:      number
  labaBersih:      number
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

export function SummaryCards({ totalPendapatan, totalHPP, marginBruto, totalBiaya, labaBersih }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Total Pendapatan
        </p>
        <p className="font-display font-bold text-xl text-on-surface">{rupiah(totalPendapatan)}</p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Total HPP
        </p>
        <p className="font-display font-bold text-xl text-error">{rupiah(totalHPP)}</p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Margin Bruto
        </p>
        <p className={`font-display font-bold text-xl ${marginBruto >= 0 ? 'text-[#15803d]' : 'text-error'}`}>
          {rupiah(marginBruto)}
        </p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Total Biaya
        </p>
        <p className="font-display font-bold text-xl text-error">{rupiah(totalBiaya)}</p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Laba Bersih
        </p>
        <p className={`font-display font-bold text-xl ${labaBersih >= 0 ? 'text-primary' : 'text-error'}`}>
          {rupiah(labaBersih)}
        </p>
      </Card>
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/laporan/income-statement/components/SummaryCards.tsx`.

- [ ] **Step 2: Write PendapatanTable**

```tsx
import { Card } from '@/components/ui/Card'

export interface PendapatanRow {
  kelas:        string
  jenis:        string
  qty:          number
  pendapatan:   number
  harga_beli:   number
  hpp:          number
  margin_bruto: number
}

interface PendapatanTableProps {
  rows: PendapatanRow[]
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

export function PendapatanTable({ rows }: PendapatanTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant text-center py-8">
          Belum ada data transaksi untuk musim ini.
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
              {['Kelas', 'Jenis', 'Qty', 'Pendapatan', 'HPP', 'Margin Bruto'].map((h) => (
                <th key={h} className={`py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest ${
                  ['Qty', 'Pendapatan', 'HPP', 'Margin Bruto'].includes(h) ? 'text-right' : 'text-left'
                }`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                <td className="py-3 px-4 font-body font-medium text-on-surface">{r.kelas}</td>
                <td className="py-3 px-4 font-body text-on-surface-variant">{r.jenis}</td>
                <td className="py-3 px-4 font-display text-right text-on-surface">{r.qty}</td>
                <td className="py-3 px-4 font-display text-right text-on-surface whitespace-nowrap">{rupiah(r.pendapatan)}</td>
                <td className="py-3 px-4 font-display text-right text-error whitespace-nowrap">{rupiah(r.hpp)}</td>
                <td className={`py-3 px-4 font-display font-semibold text-right whitespace-nowrap ${
                  r.margin_bruto >= 0 ? 'text-[#15803d]' : 'text-error'
                }`}>{rupiah(r.margin_bruto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
```

Save to `frontend/app/(dashboard)/laporan/income-statement/components/PendapatanTable.tsx`.

- [ ] **Step 3: Write BiayaTable**

```tsx
import { Card } from '@/components/ui/Card'

export interface BiayaRow {
  divisi:      string
  total_biaya: number
}

interface BiayaTableProps {
  rows:       BiayaRow[]
  totalBiaya: number
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

export function BiayaTable({ rows, totalBiaya }: BiayaTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant text-center py-8">
          Belum ada realisasi biaya untuk musim ini.
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
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Divisi</th>
              <th className="text-right py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Total Biaya</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.divisi} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                <td className="py-3 px-4 font-body font-medium text-on-surface">{r.divisi}</td>
                <td className="py-3 px-4 font-display text-right text-error whitespace-nowrap">{rupiah(r.total_biaya)}</td>
              </tr>
            ))}
            <tr className="bg-surface-low">
              <td className="py-3 px-4 font-body font-semibold text-on-surface">Total</td>
              <td className="py-3 px-4 font-display font-bold text-right text-error whitespace-nowrap">{rupiah(totalBiaya)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}
```

Save to `frontend/app/(dashboard)/laporan/income-statement/components/BiayaTable.tsx`.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/laporan/income-statement/components/"
git commit -m "feat(income-statement): add SummaryCards, PendapatanTable, BiayaTable components"
```

---

## Task 4: Frontend — Page + Sidebar

**Files:**
- Create: `frontend/app/(dashboard)/laporan/income-statement/page.tsx`
- Modify: `frontend/components/shared/Sidebar.tsx`

- [ ] **Step 1: Write page.tsx**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SummaryCards }    from './components/SummaryCards'
import { PendapatanTable, type PendapatanRow } from './components/PendapatanTable'
import { BiayaTable, type BiayaRow }           from './components/BiayaTable'
import api from '@/lib/api'

interface IncomeStatementData {
  musim:            number
  pendapatan_kelas: PendapatanRow[]
  total_pendapatan: number
  total_hpp:        number
  margin_bruto:     number
  biaya_divisi:     BiayaRow[]
  total_biaya:      number
  laba_bersih:      number
}

const emptyData: IncomeStatementData = {
  musim: new Date().getFullYear(),
  pendapatan_kelas: [],
  total_pendapatan: 0,
  total_hpp: 0,
  margin_bruto: 0,
  biaya_divisi: [],
  total_biaya: 0,
  laba_bersih: 0,
}

export default function IncomeStatementPage() {
  const currentYear = new Date().getFullYear()

  const [data,    setData]    = useState<IncomeStatementData>(emptyData)
  const [musim,   setMusim]   = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/laporan/income-statement?musim=${musim}`)
      setData(res.data)
    } catch {
      setError('Gagal memuat income statement.')
    } finally {
      setLoading(false)
    }
  }, [musim])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleExportCsv() {
    try {
      const res = await api.get(`/api/laporan/income-statement/export?musim=${musim}`, { responseType: 'blob' })
      const url  = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const link = document.createElement('a')
      link.href     = url
      link.download = `income-statement-${musim}.csv`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch {
      alert('Gagal export.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Income Statement</h1>
          <p className="text-sm text-on-surface-variant mt-1">Laporan laba rugi per kelas & divisi</p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button variant="secondary" onClick={handleExportCsv}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            Cetak PDF
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          <SummaryCards
            totalPendapatan={data.total_pendapatan}
            totalHPP={data.total_hpp}
            marginBruto={data.margin_bruto}
            totalBiaya={data.total_biaya}
            labaBersih={data.laba_bersih}
          />

          <div>
            <h2 className="font-display font-semibold text-base text-on-surface mb-3">
              Pendapatan per Kelas
            </h2>
            <PendapatanTable rows={data.pendapatan_kelas} />
          </div>

          <div>
            <h2 className="font-display font-semibold text-base text-on-surface mb-3">
              Biaya Operasional per Divisi
            </h2>
            <BiayaTable rows={data.biaya_divisi} totalBiaya={data.total_biaya} />
          </div>
        </div>
      )}
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/laporan/income-statement/page.tsx`.

- [ ] **Step 2: Update Sidebar**

In `frontend/components/shared/Sidebar.tsx`:

Add `TrendingUp` to lucide-react import:
```tsx
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  Wallet, Truck, ClipboardList, ClipboardCheck, LogOut, Database, PawPrint, Grid3x3, Receipt, Layers, BarChart2, HandCoins, BookOpen, TrendingUp
} from 'lucide-react'
```

Add nav item AFTER the `/keuangan/rab` entry:
```tsx
  { href: '/keuangan/rab',             label: 'RAB & Realisasi',   icon: BookOpen,   roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
  { href: '/laporan/income-statement', label: 'Income Statement',  icon: TrendingUp, roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
```

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output. Fix any errors before committing.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/laporan/income-statement/page.tsx" frontend/components/shared/Sidebar.tsx
git commit -m "feat(income-statement): wire T-13 income statement page + sidebar link"
```

---

## Task 5: Verification + Close T-13

**Files:**
- Modify: `docs/tasks/T-13-income-statement.md`
- Modify: `docs/TASKS.md`

- [ ] **Step 1: Run all backend tests**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Laporan/IncomeStatementTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 9 tests PASS.

- [ ] **Step 2: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -5
```

Expected: no output.

- [ ] **Step 3: Smoke test checklist**

With backend on :8000 and frontend on :3000:

- [ ] `/laporan/income-statement` loads without errors (KEPALA_DEPOT role)
- [ ] Sidebar shows "Income Statement" link
- [ ] Summary cards show 5 values (all zeros if no data is OK)
- [ ] Pendapatan table shows "Belum ada data" when empty
- [ ] Biaya table shows "Belum ada realisasi" when empty
- [ ] Musim year input changes data on change
- [ ] Export CSV downloads a file
- [ ] Cetak PDF opens browser print dialog

- [ ] **Step 4: Update T-13 task doc**

In `docs/tasks/T-13-income-statement.md`:
- `**Status:** \`TODO\`` → `**Status:** \`DONE\``
- All `- [ ]` in Acceptance Criteria → `- [x]`
- All `- [ ]` in Technical Tasks → `- [x]`
- Add to Notes: "PDF export uses window.print() (browser print). Excel export is CSV format for MVP."

- [ ] **Step 5: Update TASKS.md**

- T-13 row: `⬜ TODO` → `✅ DONE`
- Phase 2 progress: `4 / 10` → `5 / 10`
- Summary table: Phase 2 Selesai `4→5`, Sisa `6→5`; TOTAL Selesai `12→13`, Sisa `13→12`

- [ ] **Step 6: Commit + tag**

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-13-income-statement.md docs/TASKS.md
git commit -m "docs: mark T-13 Income Statement as DONE"
git tag t-13-complete
```

---

## Acceptance Criteria Checklist

- [ ] Laporan generate otomatis dari transaksi + realisasi yang sudah ada
- [ ] Breakdown per kelas per jenis: qty, pendapatan, HPP, margin bruto
- [ ] Total biaya operasional per divisi (dari RAB realisasi)
- [ ] Laba bersih = margin bruto − total biaya operasional
- [ ] Filter musim (default current year)
- [ ] Export CSV downloads file
- [ ] PDF export via window.print()
- [ ] All 9 backend tests pass
- [ ] Frontend page accessible to KEPALA_DEPOT
