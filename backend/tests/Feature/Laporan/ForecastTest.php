<?php

namespace Tests\Feature\Laporan;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\TargetPenjualan;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ForecastTest extends TestCase
{
    use RefreshDatabase;

    private User  $kepala;
    private Depot $depot;
    private int   $musim;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot  = Depot::factory()->create();
        $this->kepala = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);
        $this->musim = (int) date('Y');
    }

    private function makeTarget(string $jenis, string $tgl, int $unit): TargetPenjualan
    {
        return TargetPenjualan::create([
            'depot_id'    => $this->depot->id,
            'musim'       => $this->musim,
            'jenis'       => $jenis,
            'tgl'         => $tgl,
            'target_unit' => $unit,
            'created_by'  => $this->kepala->id,
        ]);
    }

    // ─── set target ──────────────────────────────────────────────────────────

    public function test_kepala_can_set_target(): void
    {
        $res = $this->actingAs($this->kepala)->postJson('/api/laporan/target', [
            'jenis'       => 'SAPI',
            'tgl'         => '2026-05-01',
            'musim'       => $this->musim,
            'target_unit' => 5,
        ]);

        $res->assertCreated()->assertJsonPath('target.target_unit', 5);
        $this->assertDatabaseHas('target_penjualan', ['jenis' => 'SAPI', 'target_unit' => 5]);
    }

    public function test_set_target_upserts_existing(): void
    {
        $this->makeTarget('SAPI', '2026-05-01', 5);

        $res = $this->actingAs($this->kepala)->postJson('/api/laporan/target', [
            'jenis' => 'SAPI', 'tgl' => '2026-05-01',
            'musim' => $this->musim, 'target_unit' => 8,
        ]);

        $res->assertOk()->assertJsonPath('target.target_unit', 8);
        $this->assertDatabaseCount('target_penjualan', 1);
    }

    public function test_set_target_validates_required(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/laporan/target', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['jenis', 'tgl', 'musim', 'target_unit']);
    }

    // ─── forecast ────────────────────────────────────────────────────────────

    public function test_forecast_returns_target_vs_realisasi(): void
    {
        $this->makeTarget('SAPI', '2026-05-01', 5);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/laporan/forecast?tgl_dari=2026-05-01&tgl_sampai=2026-05-01&musim={$this->musim}");

        $res->assertOk()->assertJsonStructure([
            'musim', 'sapi' => [['tgl', 'target', 'realisasi']], 'domba',
        ]);

        $sapiDay = collect($res->json('sapi'))->firstWhere('tgl', '2026-05-01');
        $this->assertEquals(5, $sapiDay['target']);
        $this->assertIsInt($sapiDay['realisasi']);
    }

    public function test_forecast_validates_required_dates(): void
    {
        $this->actingAs($this->kepala)->getJson('/api/laporan/forecast')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tgl_dari', 'tgl_sampai']);
    }

    public function test_forecast_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        TargetPenjualan::create([
            'depot_id' => $otherDepot->id, 'musim' => $this->musim,
            'jenis' => 'SAPI', 'tgl' => '2026-05-01', 'target_unit' => 99,
        ]);
        $this->makeTarget('SAPI', '2026-05-01', 5);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/laporan/forecast?tgl_dari=2026-05-01&tgl_sampai=2026-05-01&musim={$this->musim}");

        $sapiDay = collect($res->json('sapi'))->firstWhere('tgl', '2026-05-01');
        $this->assertEquals(5, $sapiDay['target']);
    }

    public function test_forecast_returns_both_jenis(): void
    {
        $res = $this->actingAs($this->kepala)
            ->getJson("/api/laporan/forecast?tgl_dari=2026-05-01&tgl_sampai=2026-05-03&musim={$this->musim}");

        $res->assertOk();
        $this->assertCount(3, $res->json('sapi'));
        $this->assertCount(3, $res->json('domba'));
    }

    public function test_realisasi_counts_non_cancelled_transaksi(): void
    {
        $kelas    = KelasHewan::create(['kode' => 'A', 'nama' => 'A', 'urutan' => 1]);
        $customer = Customer::create(['nama' => 'Test', 'hp' => '0812']);

        // Create 2 SAPI transaksi today
        foreach ([1, 2] as $seq) {
            Transaksi::create([
                'depot_id' => $this->depot->id, 'no_faktur' => "FAK-{$seq}",
                'customer_id' => $customer->id, 'tipe_qurban' => 'SHQ',
                'jenis' => 'SAPI', 'kelas_id' => $kelas->id,
                'harga' => 5_000_000, 'total' => 5_000_000, 'musim' => $this->musim,
                'status_transaksi' => 'SELESAI',
            ]);
        }
        // Create 1 CANCELLED (should not be counted)
        Transaksi::create([
            'depot_id' => $this->depot->id, 'no_faktur' => 'FAK-BATAL',
            'customer_id' => $customer->id, 'tipe_qurban' => 'SHQ',
            'jenis' => 'SAPI', 'kelas_id' => $kelas->id,
            'harga' => 5_000_000, 'total' => 5_000_000, 'musim' => $this->musim,
            'status_transaksi' => 'DIBATALKAN',
        ]);

        $today = today()->toDateString();
        $res   = $this->actingAs($this->kepala)
            ->getJson("/api/laporan/forecast?tgl_dari={$today}&tgl_sampai={$today}&musim={$this->musim}");

        $sapiDay = collect($res->json('sapi'))->firstWhere('tgl', $today);
        $this->assertEquals(2, $sapiDay['realisasi']); // 2 not-cancelled
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/laporan/forecast')->assertUnauthorized();
        $this->postJson('/api/laporan/target', [])->assertUnauthorized();
    }
}
