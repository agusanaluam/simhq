<?php
namespace Tests\Feature\Hewan;

use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HewanRegistrasiTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;
    private KelasHewan $kelasA;
    private Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->depot      = Depot::factory()->create();
        $this->kelasA     = KelasHewan::create(['kode' => 'A', 'nama' => 'A', 'urutan' => 4]);
        $this->supplier   = Supplier::create(['nama' => 'GUM', 'is_gum' => true, 'is_active' => true]);
    }

    private function hewanPayload(array $override = []): array
    {
        return array_merge([
            'depot_id'      => $this->depot->id,
            'supplier_id'   => $this->supplier->id,
            'kelas_asal_id' => $this->kelasA->id,
            'kelas_jual_id' => $this->kelasA->id,
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 250.5,
            'tgl_masuk'     => '2026-05-01',
            'musim'         => 2026,
        ], $override);
    }

    public function test_registrasi_hewan_baru_generates_no_hewan(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan', $this->hewanPayload())
            ->assertCreated()
            ->assertJsonPath('hewan.no_hewan', '600')
            ->assertJsonPath('hewan.status', 'AVAILABLE');
    }

    public function test_no_hewan_auto_increment(): void
    {
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload());
        $r2 = $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload());
        $r2->assertJsonPath('hewan.no_hewan', '601');
    }

    public function test_list_hewan_with_status_filter(): void
    {
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload(['jenis' => 'DOMBA', 'bobot_masuk' => 30]));

        $this->actingAs($this->superAdmin)
            ->getJson("/api/hewan?depot={$this->depot->id}&status=AVAILABLE")
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'no_hewan', 'jenis', 'status']]]);
    }

    public function test_get_hewan_detail_with_qr(): void
    {
        $r  = $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload());
        $id = $r->json('hewan.id');

        $this->actingAs($this->superAdmin)
            ->getJson("/api/hewan/{$id}")
            ->assertOk()
            ->assertJsonStructure(['hewan' => ['id', 'no_hewan', 'qr_svg']]);
    }

    public function test_statistik_pengadaan(): void
    {
        $this->actingAs($this->superAdmin)
            ->getJson("/api/hewan/statistik?depot={$this->depot->id}&musim=2026")
            ->assertOk()
            ->assertJsonStructure(['total', 'per_jenis', 'per_status']);
    }
}
