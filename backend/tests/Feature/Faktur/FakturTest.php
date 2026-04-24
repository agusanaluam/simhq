<?php

namespace Tests\Feature\Faktur;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Depot;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\Supplier;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FakturTest extends TestCase
{
    use RefreshDatabase;

    private User      $kepala;
    private Depot     $depot;
    private Transaksi $transaksi;
    private Hewan     $hewan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->depot  = Depot::factory()->create();
        $this->kepala = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);

        $kelas    = KelasHewan::create(['kode' => 'A', 'nama' => 'Kelas A', 'urutan' => 1]);
        $supplier = Supplier::create(['nama' => 'GUM', 'is_gum' => true, 'is_active' => true]);
        $customer = Customer::create(['nama' => 'Ahmad Fauzi', 'hp' => '081234567890']);

        $this->hewan = Hewan::create([
            'depot_id'      => $this->depot->id,
            'supplier_id'   => $supplier->id,
            'kelas_asal_id' => $kelas->id,
            'kelas_jual_id' => $kelas->id,
            'no_hewan'      => '001',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300.00,
            'tgl_masuk'     => today()->toDateString(),
            'musim'         => (int) date('Y'),
            'status'        => 'AVAILABLE',
        ]);

        $this->transaksi = Transaksi::create([
            'depot_id'    => $this->depot->id,
            'no_faktur'   => 'BPS-2026-0001',
            'customer_id' => $customer->id,
            'hewan_id'    => $this->hewan->id,
            'tipe_qurban' => 'SHQ',
            'jenis'       => 'SAPI',
            'kelas_id'    => $kelas->id,
            'harga'       => 10_000_000,
            'total'       => 10_000_000,
            'musim'       => (int) date('Y'),
        ]);
    }

    public function test_can_get_transaksi_faktur(): void
    {
        $res = $this->actingAs($this->kepala)
            ->getJson("/api/transaksi/{$this->transaksi->id}/faktur");

        $res->assertOk()
            ->assertJsonStructure([
                'transaksi' => ['id', 'no_faktur', 'tipe_qurban', 'jenis', 'harga', 'customer'],
                'slots',
            ]);
    }

    public function test_transaksi_faktur_includes_7_slots_for_sapi(): void
    {
        $res = $this->actingAs($this->kepala)
            ->getJson("/api/transaksi/{$this->transaksi->id}/faktur");

        $this->assertCount(7, $res->json('slots'));
    }

    public function test_cannot_get_other_depots_transaksi_faktur(): void
    {
        $otherDepot  = Depot::factory()->create();
        $otherKepala = User::factory()->create([
            'depot_id' => $otherDepot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);

        $this->actingAs($otherKepala)
            ->getJson("/api/transaksi/{$this->transaksi->id}/faktur")
            ->assertForbidden();
    }

    public function test_can_get_ploting_faktur(): void
    {
        $res = $this->actingAs($this->kepala)
            ->getJson("/api/hewan/{$this->hewan->id}/faktur-ploting");

        $res->assertOk()
            ->assertJsonStructure([
                'hewan' => ['id', 'no_hewan', 'jenis'],
                'slots',
            ]);

        $this->assertCount(7, $res->json('slots'));
    }

    public function test_cannot_get_other_depots_ploting_faktur(): void
    {
        $otherDepot  = Depot::factory()->create();
        $otherKepala = User::factory()->create([
            'depot_id' => $otherDepot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);

        $this->actingAs($otherKepala)
            ->getJson("/api/hewan/{$this->hewan->id}/faktur-ploting")
            ->assertForbidden();
    }

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson("/api/transaksi/{$this->transaksi->id}/faktur")->assertUnauthorized();
        $this->getJson("/api/hewan/{$this->hewan->id}/faktur-ploting")->assertUnauthorized();
    }
}
