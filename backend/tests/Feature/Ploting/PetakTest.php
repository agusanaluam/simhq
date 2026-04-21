<?php
namespace Tests\Feature\Ploting;

use App\Models\Depot;
use App\Models\PetakKandang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PetakTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->depot      = Depot::factory()->create();
    }

    public function test_list_petak_per_depot(): void
    {
        PetakKandang::create([
            'depot_id' => $this->depot->id, 'no_petak' => 'S-01',
            'jenis_kandang' => 'SAPI', 'kapasitas' => 5,
            'posisi_x' => 0, 'posisi_y' => 0,
        ]);

        $this->actingAs($this->superAdmin)
            ->getJson("/api/petak?depot={$this->depot->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'no_petak', 'jenis_kandang', 'kapasitas', 'posisi_x', 'posisi_y']]]);
    }

    public function test_store_petak(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/petak', [
                'depot_id' => $this->depot->id, 'no_petak' => 'S-01',
                'jenis_kandang' => 'SAPI', 'kapasitas' => 5,
                'posisi_x' => 0, 'posisi_y' => 0,
            ])
            ->assertCreated()
            ->assertJsonPath('petak.no_petak', 'S-01');
    }

    public function test_update_petak_kapasitas(): void
    {
        $petak = PetakKandang::create([
            'depot_id' => $this->depot->id, 'no_petak' => 'D-01',
            'jenis_kandang' => 'DOMBA', 'kapasitas' => 3,
            'posisi_x' => 1, 'posisi_y' => 0,
        ]);

        $this->actingAs($this->superAdmin)
            ->putJson("/api/petak/{$petak->id}", ['kapasitas' => 10])
            ->assertOk()
            ->assertJsonPath('petak.kapasitas', 10);
    }

    public function test_save_layout_updates_positions(): void
    {
        $p1 = PetakKandang::create(['depot_id' => $this->depot->id, 'no_petak' => 'S-01', 'jenis_kandang' => 'SAPI', 'kapasitas' => 1, 'posisi_x' => 0, 'posisi_y' => 0]);
        $p2 = PetakKandang::create(['depot_id' => $this->depot->id, 'no_petak' => 'S-02', 'jenis_kandang' => 'SAPI', 'kapasitas' => 1, 'posisi_x' => 1, 'posisi_y' => 0]);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/petak/layout', [
                'layout' => [
                    ['id' => $p1->id, 'posisi_x' => 2, 'posisi_y' => 1],
                    ['id' => $p2->id, 'posisi_x' => 3, 'posisi_y' => 1],
                ],
            ])
            ->assertOk();

        $this->assertDatabaseHas('petak_kandang', ['id' => $p1->id, 'posisi_x' => 2, 'posisi_y' => 1]);
    }
}
