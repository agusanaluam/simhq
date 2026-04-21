<?php
namespace Tests\Feature\Hewan;

use App\Models\Depot;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\PetakKandang;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HewanTransferTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Hewan $hewan;
    private PetakKandang $petakAsal;
    private PetakKandang $petakTujuan;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $depot    = Depot::factory()->create();
        $kelas    = KelasHewan::create(['kode' => 'B', 'nama' => 'Bagus', 'urutan' => 3]);
        $supplier = Supplier::create(['nama' => 'GUM', 'is_gum' => true, 'is_active' => true]);

        $this->petakAsal    = PetakKandang::create(['depot_id' => $depot->id, 'no_petak' => 'S-01', 'jenis_kandang' => 'SAPI', 'kapasitas' => 5, 'posisi_x' => 0, 'posisi_y' => 0]);
        $this->petakTujuan  = PetakKandang::create(['depot_id' => $depot->id, 'no_petak' => 'S-02', 'jenis_kandang' => 'SAPI', 'kapasitas' => 5, 'posisi_x' => 1, 'posisi_y' => 0]);

        $this->hewan = Hewan::create([
            'depot_id'      => $depot->id,
            'supplier_id'   => $supplier->id,
            'kelas_asal_id' => $kelas->id,
            'kelas_jual_id' => $kelas->id,
            'no_hewan'      => '001',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300,
            'tgl_masuk'     => '2026-05-01',
            'musim'         => 2026,
            'status'        => 'AVAILABLE',
            'petak_id'      => $this->petakAsal->id,
        ]);
    }

    public function test_transfer_petak_creates_riwayat(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson("/api/hewan/{$this->hewan->id}/transfer", [
                'ke_petak_id' => $this->petakTujuan->id,
                'catatan'     => 'Pindah ke kandang besar',
            ])
            ->assertOk()
            ->assertJsonStructure(['hewan', 'riwayat']);

        $this->assertDatabaseHas('riwayat_perpindahan', [
            'hewan_id'      => $this->hewan->id,
            'dari_petak_id' => $this->petakAsal->id,
            'ke_petak_id'   => $this->petakTujuan->id,
        ]);
    }

    public function test_update_kelas_jual(): void
    {
        $kelasIST = KelasHewan::create(['kode' => 'IST', 'nama' => 'Istimewa', 'urutan' => 8]);

        $this->actingAs($this->superAdmin)
            ->putJson("/api/hewan/{$this->hewan->id}", ['kelas_jual_id' => $kelasIST->id])
            ->assertOk()
            ->assertJsonPath('hewan.kelas_jual_id', $kelasIST->id);
    }
}
