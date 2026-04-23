<?php
// backend/tests/Feature/Dashboard/DashboardTest.php

namespace Tests\Feature\Dashboard;

use App\Enums\MetodeBayar;
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
    private int $seq = 0;

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
        $this->seq++;
        return Hewan::create(array_merge([
            'depot_id'      => $this->depot->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'no_hewan'      => str_pad($this->seq, 3, '0', STR_PAD_LEFT),
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
            ->assertJsonPath('stok.tersedia', 2)
            ->assertJsonPath('stok.terjual', 2)
            ->assertJsonPath('stok.delivered', 1)
            ->assertJsonPath('stok.mati', 1);
    }

    public function test_stok_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        $this->makeHewan();
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

        $res->assertJsonPath('pendapatan.musim', 6_000_000);
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

    public function test_transaksi_hari_ini_scoped_to_current_musim(): void
    {
        $customer = Customer::create(['nama' => 'Musim Test', 'hp' => '08199999999']);

        // Transaksi for musim 2025 — should NOT be counted
        $hewan2025 = Hewan::create([
            'depot_id'      => $this->depot->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'no_hewan'      => '800',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 200,
            'tgl_masuk'     => now()->toDateString(),
            'musim'         => 2025,
            'status'        => 'SOLD',
        ]);
        Transaksi::create([
            'depot_id'         => $this->depot->id,
            'no_faktur'        => 'INV-M2025',
            'hewan_id'         => $hewan2025->id,
            'customer_id'      => $customer->id,
            'tipe_qurban'      => 'SHQ',
            'jenis'            => 'SAPI',
            'kelas_id'         => $this->kelas->id,
            'harga'            => 5_000_000,
            'total'            => 5_000_000,
            'musim'            => 2025,
            'status_bayar'     => 'LUNAS',
            'status_transaksi' => 'SELESAI',
        ]);

        // Transaksi for musim 2026 — should be counted
        $hewan2026 = $this->makeHewan(['status' => 'SOLD']);
        Transaksi::create([
            'depot_id'         => $this->depot->id,
            'no_faktur'        => 'INV-M2026',
            'hewan_id'         => $hewan2026->id,
            'customer_id'      => $customer->id,
            'tipe_qurban'      => 'SHQ',
            'jenis'            => 'SAPI',
            'kelas_id'         => $this->kelas->id,
            'harga'            => 6_000_000,
            'total'            => 6_000_000,
            'musim'            => 2026,
            'status_bayar'     => 'LUNAS',
            'status_transaksi' => 'SELESAI',
        ]);

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/dashboard/depot?musim=2026');

        $res->assertOk()
            ->assertJsonPath('transaksi_hari_ini.total', 1);
    }

    public function test_unauthenticated_cannot_access_dashboard(): void
    {
        $this->getJson('/api/dashboard/depot?musim=2026')
            ->assertUnauthorized();
    }
}
