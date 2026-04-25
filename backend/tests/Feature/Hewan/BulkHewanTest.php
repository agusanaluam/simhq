<?php
namespace Tests\Feature\Hewan;

use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BulkHewanTest extends TestCase
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

    private function payload(array $override = []): array
    {
        return array_merge([
            'depot_id'    => $this->depot->id,
            'supplier_id' => null,
            'jenis'       => 'SAPI',
            'tgl_masuk'   => '2026-05-01',
            'musim'       => 2026,
            'rows'        => [
                ['kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 300],
                ['kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 280],
                ['kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 320],
            ],
        ], $override);
    }

    public function test_bulk_store_returns_201_with_correct_count(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->payload())
            ->assertCreated()
            ->assertJsonPath('count', 3)
            ->assertJsonCount(3, 'hewan');
    }

    public function test_bulk_store_assigns_sequential_no_hewan(): void
    {
        $res = $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->payload())
            ->assertCreated();

        $numbers = collect($res->json('hewan'))->pluck('no_hewan')->sort()->values()->toArray();
        $this->assertEquals(['600', '601', '602'], $numbers);
    }

    public function test_empty_rows_returns_422(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->payload(['rows' => []]))
            ->assertUnprocessable();
    }

    public function test_rows_exceeding_50_returns_422(): void
    {
        $row  = ['kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 300];
        $rows = array_fill(0, 51, $row);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->payload(['rows' => $rows]))
            ->assertUnprocessable();
    }

    public function test_invalid_kelas_asal_id_returns_422(): void
    {
        $bad = [['kelas_asal_id' => 9999, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 300]];

        $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->payload(['rows' => $bad]))
            ->assertUnprocessable();
    }

    public function test_bobot_masuk_zero_returns_422(): void
    {
        $bad = [['kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 0]];

        $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->payload(['rows' => $bad]))
            ->assertUnprocessable();
    }
}
