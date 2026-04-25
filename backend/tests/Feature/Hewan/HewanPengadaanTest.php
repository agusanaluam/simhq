<?php
namespace Tests\Feature\Hewan;

use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HewanPengadaanTest extends TestCase
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

    private function hewanPayload(array $override = []): array
    {
        return array_merge([
            'depot_id'      => $this->depot->id,
            'supplier_id'   => null,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300,
            'tgl_masuk'     => '2026-05-01',
            'musim'         => 2026,
        ], $override);
    }

    private function bulkPayload(int $count = 3, array $override = []): array
    {
        $row = ['kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 300];
        return array_merge([
            'depot_id'    => $this->depot->id,
            'supplier_id' => null,
            'jenis'       => 'SAPI',
            'tgl_masuk'   => '2026-05-01',
            'musim'       => 2026,
            'rows'        => array_fill(0, $count, $row),
        ], $override);
    }

    public function test_store_assigns_no_pengadaan_1_for_first_animal(): void
    {
        $res = $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan', $this->hewanPayload())
            ->assertCreated();

        $this->assertEquals(1, $res->json('hewan.no_pengadaan'));
    }

    public function test_two_sequential_stores_get_different_no_pengadaan(): void
    {
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();
        $r2 = $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();

        $this->assertEquals(2, $r2->json('hewan.no_pengadaan'));
    }

    public function test_bulk_assigns_same_no_pengadaan_to_all_rows(): void
    {
        $res = $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->bulkPayload(3))
            ->assertCreated();

        $numbers = collect($res->json('hewan'))->pluck('no_pengadaan')->unique()->values()->toArray();
        $this->assertCount(1, $numbers);
        $this->assertEquals(1, $numbers[0]);
    }

    public function test_bulk_after_single_store_increments_no_pengadaan(): void
    {
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();

        $res = $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->bulkPayload(2))
            ->assertCreated();

        $this->assertEquals(2, $res->json('hewan.0.no_pengadaan'));
    }

    public function test_store_with_null_kelas_jual_returns_201(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan', $this->hewanPayload(['kelas_jual_id' => null]))
            ->assertCreated()
            ->assertJsonPath('hewan.kelas_jual', null);
    }

    public function test_index_unclassed_filter_returns_only_null_kelas_jual(): void
    {
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload(['kelas_jual_id' => null]))->assertCreated();

        $res = $this->actingAs($this->superAdmin)
            ->getJson("/api/hewan?depot={$this->depot->id}&kelas=UNCLASSED")
            ->assertOk();

        $this->assertEquals(1, $res->json('total'));
        $this->assertNull($res->json('data.0.kelas_jual'));
    }

    public function test_update_assigns_kelas_jual_to_unclassed_animal(): void
    {
        $r  = $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan', $this->hewanPayload(['kelas_jual_id' => null]))
            ->assertCreated();
        $id = $r->json('hewan.id');

        $this->actingAs($this->superAdmin)
            ->putJson("/api/hewan/{$id}", ['kelas_jual_id' => $this->kelas->id])
            ->assertOk()
            ->assertJsonPath('hewan.kelas_jual.id', $this->kelas->id);
    }
}
