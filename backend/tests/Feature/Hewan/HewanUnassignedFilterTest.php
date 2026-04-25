<?php
namespace Tests\Feature\Hewan;

use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\PetakKandang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HewanUnassignedFilterTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;
    private KelasHewan $kelas;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->depot      = Depot::factory()->create();
        $this->kelas      = KelasHewan::create(['kode' => 'A', 'nama' => 'A', 'urutan' => 4]);
    }

    private function hewanPayload(): array
    {
        return [
            'depot_id'      => $this->depot->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300,
            'tgl_masuk'     => '2026-05-01',
            'musim'         => 2026,
        ];
    }

    public function test_unassigned_filter_returns_only_animals_without_petak(): void
    {
        $petak = PetakKandang::create([
            'depot_id'      => $this->depot->id,
            'no_petak'      => 'S-01',
            'jenis_kandang' => 'SAPI',
            'kapasitas'     => 10,
            'posisi_x'      => 0,
            'posisi_y'      => 0,
        ]);

        $r1 = $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();
        $this->actingAs($this->superAdmin)
            ->postJson("/api/hewan/{$r1->json('hewan.id')}/transfer", ['ke_petak_id' => $petak->id])
            ->assertOk();

        $res = $this->actingAs($this->superAdmin)
            ->getJson('/api/hewan?unassigned=1')
            ->assertOk();

        $this->assertEquals(1, $res->json('total'));
        $this->assertNull($res->json('data.0.petak_id'));
    }

    public function test_without_unassigned_filter_returns_all_animals(): void
    {
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();

        $res = $this->actingAs($this->superAdmin)
            ->getJson('/api/hewan')
            ->assertOk();

        $this->assertEquals(2, $res->json('total'));
    }
}
