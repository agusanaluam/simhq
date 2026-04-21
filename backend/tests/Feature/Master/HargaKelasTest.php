<?php
namespace Tests\Feature\Master;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\HargaKelas;
use App\Models\KelasHewan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HargaKelasTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;
    private KelasHewan $kelas;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->depot = Depot::factory()->create();
        $this->kelas = KelasHewan::create(['kode' => 'A', 'nama' => 'A', 'urutan' => 4]);
    }

    public function test_list_kelas_hewan(): void
    {
        $this->actingAs($this->superAdmin)
            ->getJson('/api/master/kelas')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'kode', 'nama', 'urutan']]]);
    }

    public function test_list_harga_per_depot_musim(): void
    {
        HargaKelas::create([
            'depot_id'   => $this->depot->id,
            'kelas_id'   => $this->kelas->id,
            'jenis'      => 'SAPI',
            'musim'      => 2026,
            'harga_beli' => 10000000,
            'harga_jual' => 12000000,
            'fee_sales'  => 100000,
        ]);

        $this->actingAs($this->superAdmin)
            ->getJson("/api/master/harga?depot={$this->depot->id}&musim=2026")
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'jenis', 'musim', 'harga_beli', 'harga_jual']]]);
    }

    public function test_store_harga_validates_jual_greater_than_beli(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/master/harga', [
                'depot_id'   => $this->depot->id,
                'kelas_id'   => $this->kelas->id,
                'jenis'      => 'SAPI',
                'musim'      => 2026,
                'harga_beli' => 12000000,
                'harga_jual' => 10000000,
                'fee_sales'  => 0,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['harga_jual']);
    }

    public function test_store_harga_success(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/master/harga', [
                'depot_id'   => $this->depot->id,
                'kelas_id'   => $this->kelas->id,
                'jenis'      => 'SAPI',
                'musim'      => 2026,
                'harga_beli' => 10000000,
                'harga_jual' => 12000000,
                'fee_sales'  => 100000,
            ])
            ->assertCreated()
            ->assertJsonPath('harga.jenis', 'SAPI');
    }
}
