<?php
namespace Tests\Feature\Keuangan;

use App\Models\Customer;
use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\Pembayaran;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PembayaranTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Transaksi $transaksi;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin   = User::factory()->superAdmin()->create();
        $depot         = Depot::factory()->create();
        $kelas         = KelasHewan::create(['kode' => 'A1', 'nama' => 'Kelas A1', 'urutan' => 1]);
        $customer      = Customer::create(['nama' => 'Budi', 'hp' => '08111']);

        $this->transaksi = Transaksi::create([
            'depot_id'        => $depot->id,
            'no_faktur'       => '1-2026-0001',
            'customer_id'     => $customer->id,
            'tipe_qurban'     => 'SHQ',
            'jenis'           => 'SAPI',
            'kelas_id'        => $kelas->id,
            'harga'           => 6000000,
            'total'           => 6000000,
            'status_transaksi'=> 'DIKONFIRMASI',
            'musim'           => 2026,
        ]);
    }

    private function bayarPayload(array $overrides = []): array
    {
        return array_merge([
            'jumlah'   => 2000000,
            'tipe'     => 'DP',
            'metode'   => 'CASH',
            'tgl_bayar'=> '2026-04-22',
        ], $overrides);
    }

    public function test_bayar_dp_sets_status_bayar_dp(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/bayar", $this->bayarPayload())
            ->assertCreated()
            ->assertJsonPath('pembayaran.tipe', 'DP');

        $this->assertDatabaseHas('transaksi', [
            'id'          => $this->transaksi->id,
            'status_bayar'=> 'DP',
        ]);
    }

    public function test_bayar_lunas_sekaligus(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/bayar", $this->bayarPayload([
                'jumlah' => 6000000,
                'tipe'   => 'PELUNASAN',
            ]))
            ->assertCreated();

        $this->assertDatabaseHas('transaksi', [
            'id'          => $this->transaksi->id,
            'status_bayar'=> 'LUNAS',
        ]);
    }

    public function test_dp_then_pelunasan_jadi_lunas(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/bayar", $this->bayarPayload(['jumlah' => 2000000]));

        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/bayar", $this->bayarPayload([
                'jumlah' => 4000000,
                'tipe'   => 'PELUNASAN',
            ]))
            ->assertCreated();

        $this->assertDatabaseHas('transaksi', [
            'id'          => $this->transaksi->id,
            'status_bayar'=> 'LUNAS',
        ]);
    }

    public function test_sisa_pelunasan_tampil_di_detail(): void
    {
        Pembayaran::create([
            'transaksi_id' => $this->transaksi->id,
            'jumlah'       => 2000000,
            'tipe'         => 'DP',
            'metode'       => 'CASH',
            'tgl_bayar'    => '2026-04-22',
        ]);

        $this->actingAs($this->admin)
            ->getJson("/api/transaksi/{$this->transaksi->id}/pembayaran")
            ->assertOk()
            ->assertJsonPath('sisa_pelunasan', 4000000)
            ->assertJsonStructure(['pembayaran', 'total_bayar', 'sisa_pelunasan']);
    }

    public function test_biaya_tambahan_naik_total(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/biaya-tambahan", [
                'keterangan' => 'Ongkos kirim',
                'jumlah'     => 200000,
            ])
            ->assertCreated()
            ->assertJsonPath('transaksi.total', 6200000);
    }

    public function test_rekap_setoran_per_hari(): void
    {
        Pembayaran::create([
            'transaksi_id' => $this->transaksi->id,
            'jumlah'       => 3000000,
            'tipe'         => 'DP',
            'metode'       => 'CASH',
            'tgl_bayar'    => '2026-04-22',
        ]);

        $this->actingAs($this->admin)
            ->getJson('/api/laporan/rekap-setoran?tgl=2026-04-22')
            ->assertOk()
            ->assertJsonStructure(['rekap' => [['metode', 'total', 'jumlah_transaksi']]]);
    }

    public function test_list_pembayaran(): void
    {
        Pembayaran::create([
            'transaksi_id' => $this->transaksi->id,
            'jumlah'       => 1000000,
            'tipe'         => 'DP',
            'metode'       => 'TRANSFER_BCA',
            'tgl_bayar'    => '2026-04-22',
        ]);

        $this->actingAs($this->admin)
            ->getJson("/api/transaksi/{$this->transaksi->id}/pembayaran")
            ->assertOk()
            ->assertJsonStructure(['pembayaran' => [['id', 'jumlah', 'tipe', 'metode', 'tgl_bayar']]]);
    }
}
