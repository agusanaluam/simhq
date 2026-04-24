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

    private User      $kepala;
    private Depot     $depot;
    private int       $musim = 2026;
    private KelasHewan $kelas;
    private Customer  $customer;
    private int       $seq = 0;

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
