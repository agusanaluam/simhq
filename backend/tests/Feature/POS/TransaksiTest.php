<?php
// backend/tests/Feature/POS/TransaksiTest.php
namespace Tests\Feature\POS;

use App\Enums\StatusHewan;
use App\Enums\StatusTransaksi;
use App\Models\Customer;
use App\Models\Depot;
use App\Models\HargaKelas;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransaksiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Depot $depot;
    private KelasHewan $kelas;
    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin    = User::factory()->superAdmin()->create();
        $this->depot    = Depot::factory()->create();
        $this->kelas    = KelasHewan::create(['kode' => 'A1', 'nama' => 'Kelas A1', 'urutan' => 1]);
        $this->customer = Customer::create(['nama' => 'Budi', 'hp' => '08111']);

        HargaKelas::create([
            'depot_id'  => $this->depot->id,
            'kelas_id'  => $this->kelas->id,
            'jenis'     => 'SAPI',
            'musim'     => 2026,
            'harga_beli'=> 5000000,
            'harga_jual'=> 6000000,
            'fee_sales' => 50000,
        ]);
    }

    private function makeHewan(): Hewan
    {
        return Hewan::create([
            'depot_id'     => $this->depot->id,
            'kelas_asal_id'=> $this->kelas->id,
            'kelas_jual_id'=> $this->kelas->id,
            'no_hewan'     => '001',
            'jenis'        => 'SAPI',
            'bobot_masuk'  => 250,
            'tgl_masuk'    => '2026-04-01',
            'musim'        => 2026,
            'status'       => 'AVAILABLE',
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'depot_id'    => $this->depot->id,
            'customer_id' => $this->customer->id,
            'tipe_qurban' => 'SHQ',
            'jenis'       => 'SAPI',
            'kelas_id'    => $this->kelas->id,
            'musim'       => 2026,
        ], $overrides);
    }

    public function test_buat_transaksi_dengan_hewan(): void
    {
        $hewan = $this->makeHewan();

        $res = $this->actingAs($this->admin)
            ->postJson('/api/transaksi', $this->payload(['hewan_id' => $hewan->id]));

        $res->assertCreated()
            ->assertJsonPath('transaksi.status_transaksi', 'HEWAN_TERALOKASI')
            ->assertJsonStructure(['transaksi' => ['id', 'no_faktur', 'harga', 'total']]);

        $this->assertDatabaseHas('transaksi', [
            'hewan_id'        => $hewan->id,
            'status_transaksi' => 'HEWAN_TERALOKASI',
        ]);
    }

    public function test_buat_preorder_tanpa_hewan(): void
    {
        $res = $this->actingAs($this->admin)
            ->postJson('/api/transaksi', $this->payload());

        $res->assertCreated()
            ->assertJsonPath('transaksi.status_transaksi', 'MENUNGGU_HEWAN');

        $this->assertDatabaseHas('transaksi', [
            'hewan_id'        => null,
            'status_transaksi' => 'MENUNGGU_HEWAN',
        ]);
    }

    public function test_no_faktur_auto_generate_unik(): void
    {
        $hewan = $this->makeHewan();

        $r1 = $this->actingAs($this->admin)
            ->postJson('/api/transaksi', $this->payload(['hewan_id' => $hewan->id]));

        $r2 = $this->actingAs($this->admin)
            ->postJson('/api/transaksi', $this->payload());

        $noFaktur1 = $r1->json('transaksi.no_faktur');
        $noFaktur2 = $r2->json('transaksi.no_faktur');

        $this->assertNotEquals($noFaktur1, $noFaktur2);
        $this->assertStringStartsWith("{$this->depot->id}-2026-", $noFaktur1);
    }

    public function test_assign_hewan_ke_preorder(): void
    {
        $transaksi = Transaksi::create([
            'depot_id'        => $this->depot->id,
            'no_faktur'       => '1-2026-0001',
            'customer_id'     => $this->customer->id,
            'tipe_qurban'     => 'SHQ',
            'jenis'           => 'SAPI',
            'kelas_id'        => $this->kelas->id,
            'harga'           => 6000000,
            'total'           => 6000000,
            'status_transaksi'=> 'MENUNGGU_HEWAN',
            'musim'           => 2026,
        ]);

        $hewan = $this->makeHewan();

        $this->actingAs($this->admin)
            ->putJson("/api/transaksi/{$transaksi->id}/assign-hewan", ['hewan_id' => $hewan->id])
            ->assertOk()
            ->assertJsonPath('transaksi.status_transaksi', 'HEWAN_TERALOKASI')
            ->assertJsonPath('transaksi.hewan_id', $hewan->id);
    }

    public function test_konfirmasi_ubah_hewan_jadi_booked(): void
    {
        $hewan = $this->makeHewan();
        $transaksi = Transaksi::create([
            'depot_id'        => $this->depot->id,
            'no_faktur'       => '1-2026-0001',
            'customer_id'     => $this->customer->id,
            'hewan_id'        => $hewan->id,
            'tipe_qurban'     => 'SHQ',
            'jenis'           => 'SAPI',
            'kelas_id'        => $this->kelas->id,
            'harga'           => 6000000,
            'total'           => 6000000,
            'status_transaksi'=> 'HEWAN_TERALOKASI',
            'musim'           => 2026,
        ]);

        $this->actingAs($this->admin)
            ->putJson("/api/transaksi/{$transaksi->id}/konfirmasi")
            ->assertOk()
            ->assertJsonPath('transaksi.status_transaksi', 'DIKONFIRMASI');

        $this->assertDatabaseHas('hewan', ['id' => $hewan->id, 'status' => 'BOOKED']);
    }

    public function test_konfirmasi_gagal_jika_tidak_ada_hewan(): void
    {
        $transaksi = Transaksi::create([
            'depot_id'        => $this->depot->id,
            'no_faktur'       => '1-2026-0001',
            'customer_id'     => $this->customer->id,
            'tipe_qurban'     => 'SHQ',
            'jenis'           => 'SAPI',
            'kelas_id'        => $this->kelas->id,
            'harga'           => 6000000,
            'total'           => 6000000,
            'status_transaksi'=> 'MENUNGGU_HEWAN',
            'musim'           => 2026,
        ]);

        $this->actingAs($this->admin)
            ->putJson("/api/transaksi/{$transaksi->id}/konfirmasi")
            ->assertUnprocessable();
    }

    public function test_batal_kembalikan_hewan_jadi_available(): void
    {
        $hewan = $this->makeHewan();
        $hewan->update(['status' => 'BOOKED']);

        $transaksi = Transaksi::create([
            'depot_id'        => $this->depot->id,
            'no_faktur'       => '1-2026-0001',
            'customer_id'     => $this->customer->id,
            'hewan_id'        => $hewan->id,
            'tipe_qurban'     => 'SHQ',
            'jenis'           => 'SAPI',
            'kelas_id'        => $this->kelas->id,
            'harga'           => 6000000,
            'total'           => 6000000,
            'status_transaksi'=> 'DIKONFIRMASI',
            'musim'           => 2026,
        ]);

        $this->actingAs($this->admin)
            ->putJson("/api/transaksi/{$transaksi->id}/batal")
            ->assertOk()
            ->assertJsonPath('transaksi.status_transaksi', 'DIBATALKAN');

        $this->assertDatabaseHas('hewan', ['id' => $hewan->id, 'status' => 'AVAILABLE']);
    }

    public function test_list_transaksi(): void
    {
        Transaksi::create([
            'depot_id'        => $this->depot->id,
            'no_faktur'       => '1-2026-0001',
            'customer_id'     => $this->customer->id,
            'tipe_qurban'     => 'SHQ',
            'jenis'           => 'SAPI',
            'kelas_id'        => $this->kelas->id,
            'harga'           => 6000000,
            'total'           => 6000000,
            'status_transaksi'=> 'MENUNGGU_HEWAN',
            'musim'           => 2026,
        ]);

        $this->actingAs($this->admin)
            ->getJson("/api/transaksi?depot={$this->depot->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'no_faktur', 'status_transaksi', 'customer']]]);
    }
}
