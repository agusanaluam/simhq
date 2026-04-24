<?php

namespace Tests\Feature\Katalog;

use App\Models\Depot;
use App\Models\HargaKelas;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\OrderKatalog;
use App\Models\Supplier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KatalogTest extends TestCase
{
    use RefreshDatabase;

    private Depot      $depot;
    private KelasHewan $kelas;
    private Supplier   $supplier;
    private int        $musim;
    private int        $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot    = Depot::factory()->create();
        $this->kelas    = KelasHewan::create(['kode' => 'A', 'nama' => 'Kelas A', 'urutan' => 1]);
        $this->supplier = Supplier::create(['nama' => 'Supplier Test', 'is_gum' => false, 'is_active' => true]);
        $this->musim    = (int) date('Y');

        HargaKelas::create([
            'depot_id'   => $this->depot->id,
            'kelas_id'   => $this->kelas->id,
            'jenis'      => 'SAPI',
            'musim'      => $this->musim,
            'harga_beli' => 8_000_000,
            'harga_jual' => 10_000_000,
        ]);
    }

    private function makeHewan(string $status = 'AVAILABLE'): Hewan
    {
        $this->seq++;
        return Hewan::create([
            'depot_id'      => $this->depot->id,
            'supplier_id'   => $this->supplier->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'no_hewan'      => str_pad($this->seq, 3, '0', STR_PAD_LEFT),
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300.00,
            'tgl_masuk'     => today()->toDateString(),
            'musim'         => $this->musim,
            'status'        => $status,
        ]);
    }

    // ─── catalog ─────────────────────────────────────────────────────────────

    public function test_catalog_returns_available_hewan_grouped(): void
    {
        $this->makeHewan('AVAILABLE');
        $this->makeHewan('AVAILABLE');

        $res = $this->getJson("/api/katalog?depot={$this->depot->id}");

        $res->assertOk()
            ->assertJsonStructure([
                'musim',
                'data' => [['kelas', 'jenis', 'harga_jual', 'jumlah_tersedia']],
            ]);

        $row = collect($res->json('data'))->firstWhere('jenis', 'SAPI');
        $this->assertEquals(2,          $row['jumlah_tersedia']);
        $this->assertEquals(10_000_000, $row['harga_jual']);
    }

    public function test_catalog_excludes_non_available_hewan(): void
    {
        $this->makeHewan('AVAILABLE');
        $this->makeHewan('SOLD');
        $this->makeHewan('BOOKED');

        $res = $this->getJson("/api/katalog?depot={$this->depot->id}");

        $row = collect($res->json('data'))->firstWhere('jenis', 'SAPI');
        $this->assertEquals(1, $row['jumlah_tersedia']);
    }

    public function test_catalog_scoped_to_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        $this->makeHewan('AVAILABLE');
        Hewan::create([
            'depot_id' => $otherDepot->id, 'supplier_id' => $this->supplier->id,
            'kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id,
            'no_hewan' => '999', 'jenis' => 'SAPI', 'bobot_masuk' => 300,
            'tgl_masuk' => today()->toDateString(), 'musim' => $this->musim, 'status' => 'AVAILABLE',
        ]);

        $res = $this->getJson("/api/katalog?depot={$this->depot->id}");

        $row = collect($res->json('data'))->firstWhere('jenis', 'SAPI');
        $this->assertEquals(1, $row['jumlah_tersedia']);
    }

    public function test_catalog_requires_depot_param(): void
    {
        $this->getJson('/api/katalog')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['depot']);
    }

    // ─── order ───────────────────────────────────────────────────────────────

    public function test_order_can_be_submitted(): void
    {
        $res = $this->postJson('/api/katalog/order', [
            'depot_id'    => $this->depot->id,
            'nama'        => 'Ahmad Fauzi',
            'hp'          => '081234567890',
            'jenis'       => 'SAPI',
            'kelas'       => 'Kelas A',
            'tipe_qurban' => 'SHQ',
        ]);

        $res->assertCreated()->assertJsonPath('order.nama', 'Ahmad Fauzi');
        $this->assertDatabaseHas('order_katalog', ['nama' => 'Ahmad Fauzi', 'status' => 'BARU']);
    }

    public function test_order_validates_required_fields(): void
    {
        $this->postJson('/api/katalog/order', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['depot_id', 'nama', 'hp', 'jenis', 'kelas', 'tipe_qurban']);
    }

    public function test_order_rejects_invalid_tipe_qurban(): void
    {
        $this->postJson('/api/katalog/order', [
            'depot_id'    => $this->depot->id,
            'nama'        => 'Test',
            'hp'          => '081234567890',
            'jenis'       => 'SAPI',
            'kelas'       => 'Kelas A',
            'tipe_qurban' => 'INVALID',
        ])->assertUnprocessable()->assertJsonValidationErrors(['tipe_qurban']);
    }
}
