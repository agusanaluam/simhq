<?php
namespace Tests\Feature\Keuangan;

use App\Models\Customer;
use App\Models\Depot;
use App\Models\Hewan;
use App\Models\KasHarian;
use App\Models\KelasHewan;
use App\Models\Pembayaran;
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
        $this->admin = User::factory()->superAdmin()->create();
        $this->depot = Depot::factory()->create();
        $this->kelas = KelasHewan::create(['kode' => 'A1', 'nama' => 'Kelas A1', 'urutan' => 1]);
        $customer    = Customer::create(['nama' => 'Budi', 'hp' => '08111']);
        $hewan       = Hewan::create([
            'depot_id'      => $this->depot->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'no_hewan'      => '001',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 250,
            'tgl_masuk'     => today()->toDateString(),
            'musim'         => 2026,
            'status'        => 'SOLD',
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

    public function test_payment_does_not_create_kas_harian(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/bayar", [
                'jumlah'   => 6_000_000,
                'tipe'     => 'PELUNASAN',
                'metode'   => 'CASH',
                'tgl_bayar'=> today()->toDateString(),
            ])->assertCreated();

        // Pendapatan penjualan tidak masuk ke kas BIOP
        $this->assertDatabaseCount('kas_harian', 0);
    }

    public function test_payment_recorded_in_pembayaran(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/bayar", [
                'jumlah'   => 3_000_000,
                'tipe'     => 'DP',
                'metode'   => 'TRANSFER_BCA',
                'tgl_bayar'=> today()->toDateString(),
            ])->assertCreated();

        $this->assertDatabaseHas('pembayaran', [
            'transaksi_id' => $this->transaksi->id,
            'jumlah'       => 3_000_000,
            'metode'       => 'TRANSFER_BCA',
            'tipe'         => 'DP',
        ]);
    }
}
