<?php
namespace Tests\Feature\Master;

use App\Models\Depot;
use App\Models\Karyawan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KaryawanTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->depot = Depot::factory()->create();
    }

    public function test_list_karyawan_per_depot(): void
    {
        Karyawan::create([
            'depot_id'    => $this->depot->id,
            'nama'        => 'Budi',
            'divisi'      => 'Kandang',
            'tarif_harian'=> 100000,
            'berlaku_dari'=> '2026-01-01',
        ]);

        $this->actingAs($this->superAdmin)
            ->getJson("/api/karyawan?depot={$this->depot->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'nama', 'divisi', 'tarif_harian']]]);
    }

    public function test_store_karyawan(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/karyawan', [
                'depot_id'    => $this->depot->id,
                'nama'        => 'Siti Rahayu',
                'divisi'      => 'Admin',
                'tarif_harian'=> 150000,
                'berlaku_dari'=> '2026-04-01',
            ])
            ->assertCreated()
            ->assertJsonPath('karyawan.nama', 'Siti Rahayu');
    }

    public function test_update_karyawan_tarif(): void
    {
        $k = Karyawan::create([
            'depot_id'    => $this->depot->id,
            'nama'        => 'Budi',
            'divisi'      => 'Kandang',
            'tarif_harian'=> 100000,
            'berlaku_dari'=> '2026-01-01',
        ]);

        $this->actingAs($this->superAdmin)
            ->putJson("/api/karyawan/{$k->id}", ['tarif_harian' => 125000])
            ->assertOk()
            ->assertJsonPath('karyawan.tarif_harian', 125000);
    }
}
