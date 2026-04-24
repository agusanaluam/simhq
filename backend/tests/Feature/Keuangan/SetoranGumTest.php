<?php
namespace Tests\Feature\Keuangan;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\HargaKelas;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\SetoranGum;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SetoranGumTest extends TestCase
{
    use RefreshDatabase;

    private User $kepala;
    private Depot $depot;
    private Supplier $gum;
    private KelasHewan $kelas;
    private int $musim = 2026;
    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->depot  = Depot::factory()->create();
        $this->kepala = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);
        $this->gum = Supplier::create([
            'nama'      => 'GUM Pusat',
            'is_gum'    => true,
            'is_active' => true,
        ]);
        $this->kelas = KelasHewan::create([
            'kode'    => 'A1',
            'nama'    => 'Kelas A',
            'urutan'  => 1,
        ]);
    }

    /** Create a hewan from GUM with harga_beli linked via harga_kelas */
    private function makeHewan(int $hargaBeli): Hewan
    {
        $this->seq++;

        HargaKelas::firstOrCreate(
            [
                'depot_id' => $this->depot->id,
                'kelas_id' => $this->kelas->id,
                'jenis'    => 'SAPI',
                'musim'    => $this->musim,
            ],
            ['harga_beli' => $hargaBeli, 'harga_jual' => $hargaBeli + 1_000_000]
        );

        return Hewan::create([
            'depot_id'      => $this->depot->id,
            'supplier_id'   => $this->gum->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'no_hewan'      => str_pad($this->seq, 3, '0', STR_PAD_LEFT),
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300.00,
            'tgl_masuk'     => today()->toDateString(),
            'musim'         => $this->musim,
            'status'        => 'AVAILABLE',
        ]);
    }

    private function makeSetoran(array $attrs = []): SetoranGum
    {
        return SetoranGum::create(array_merge([
            'depot_id'    => $this->depot->id,
            'supplier_id' => $this->gum->id,
            'tgl_setor'   => today()->toDateString(),
            'jumlah'      => 5_000_000,
            'metode'      => 'CASH',
            'keterangan'  => 'Setoran rutin',
            'input_by'    => $this->kepala->id,
        ], $attrs));
    }

    // ─── index ───────────────────────────────────────────────────────────────

    public function test_kepala_can_list_setoran(): void
    {
        $this->makeSetoran(['jumlah' => 3_000_000]);
        $this->makeSetoran(['jumlah' => 2_000_000]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/setoran-gum');

        $res->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'tgl_setor', 'jumlah', 'metode', 'keterangan']],
                'total', 'per_page', 'current_page',
            ]);

        $this->assertCount(2, $res->json('data'));
    }

    public function test_index_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        $this->makeSetoran();
        SetoranGum::create([
            'depot_id'   => $otherDepot->id,
            'tgl_setor'  => today()->toDateString(),
            'jumlah'     => 9_000_000,
            'metode'     => 'CASH',
        ]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/setoran-gum');

        $this->assertCount(1, $res->json('data'));
    }

    public function test_index_filterable_by_date_range(): void
    {
        $this->makeSetoran(['tgl_setor' => '2026-04-01']);
        $this->makeSetoran(['tgl_setor' => '2026-04-15']);
        $this->makeSetoran(['tgl_setor' => '2026-04-30']);

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/keuangan/setoran-gum?tgl_dari=2026-04-10&tgl_sampai=2026-04-20');

        $this->assertCount(1, $res->json('data'));
    }

    // ─── store ───────────────────────────────────────────────────────────────

    public function test_kepala_can_create_setoran(): void
    {
        $res = $this->actingAs($this->kepala)->postJson('/api/keuangan/setoran-gum', [
            'tgl_setor'  => today()->toDateString(),
            'jumlah'     => 10_000_000,
            'metode'     => 'TRANSFER_BCA',
            'keterangan' => 'Bayar batch April',
        ]);

        $res->assertCreated()->assertJsonPath('setoran.jumlah', 10_000_000);
        $this->assertDatabaseHas('setoran_gum', ['jumlah' => 10_000_000, 'metode' => 'TRANSFER_BCA']);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/setoran-gum', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tgl_setor', 'jumlah', 'metode']);
    }

    public function test_store_rejects_invalid_metode(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/setoran-gum', [
            'tgl_setor' => today()->toDateString(),
            'jumlah'    => 1_000_000,
            'metode'    => 'GOPAY',
        ])->assertUnprocessable()->assertJsonValidationErrors(['metode']);
    }

    // ─── posisi ──────────────────────────────────────────────────────────────

    public function test_posisi_returns_correct_hutang_breakdown(): void
    {
        // 2 hewan × harga_beli 10_000_000 = total_pengadaan 20_000_000
        $this->makeHewan(10_000_000);
        $this->makeHewan(10_000_000);

        // 12_000_000 disetor
        $this->makeSetoran(['jumlah' => 7_000_000]);
        $this->makeSetoran(['jumlah' => 5_000_000]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/setoran-gum/posisi');

        $res->assertOk()
            ->assertJsonPath('total_pengadaan', 20_000_000)
            ->assertJsonPath('total_setor',     12_000_000)
            ->assertJsonPath('sisa_hutang',      8_000_000);
    }

    public function test_posisi_excludes_non_gum_hewan(): void
    {
        $nonGum = Supplier::create(['nama' => 'Supplier Lain', 'is_gum' => false, 'is_active' => true]);

        // 1 hewan from GUM, 1 from non-GUM — only GUM hewan counted in pengadaan
        $this->makeHewan(10_000_000);

        HargaKelas::firstOrCreate(
            ['depot_id' => $this->depot->id, 'kelas_id' => $this->kelas->id, 'jenis' => 'SAPI', 'musim' => $this->musim],
            ['harga_beli' => 10_000_000, 'harga_jual' => 11_000_000]
        );
        $this->seq++;
        Hewan::create([
            'depot_id' => $this->depot->id, 'supplier_id' => $nonGum->id,
            'kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id,
            'no_hewan' => str_pad($this->seq, 3, '0', STR_PAD_LEFT),
            'jenis' => 'SAPI', 'bobot_masuk' => 300.00,
            'tgl_masuk' => today()->toDateString(), 'musim' => $this->musim, 'status' => 'AVAILABLE',
        ]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/setoran-gum/posisi');

        $res->assertOk()->assertJsonPath('total_pengadaan', 10_000_000);
    }

    public function test_posisi_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();

        $this->makeHewan(10_000_000);

        // another depot's hewan — should NOT affect our posisi
        $otherKelas = KelasHewan::create(['kode' => 'B1', 'nama' => 'Kelas B', 'urutan' => 2]);
        HargaKelas::create([
            'depot_id' => $otherDepot->id, 'kelas_id' => $otherKelas->id,
            'jenis' => 'SAPI', 'musim' => $this->musim,
            'harga_beli' => 50_000_000, 'harga_jual' => 55_000_000,
        ]);
        Hewan::create([
            'depot_id' => $otherDepot->id, 'supplier_id' => $this->gum->id,
            'kelas_asal_id' => $otherKelas->id, 'kelas_jual_id' => $otherKelas->id,
            'no_hewan' => '001', 'jenis' => 'SAPI', 'bobot_masuk' => 300.00,
            'tgl_masuk' => today()->toDateString(), 'musim' => $this->musim, 'status' => 'AVAILABLE',
        ]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/setoran-gum/posisi');

        $res->assertOk()->assertJsonPath('total_pengadaan', 10_000_000);
    }

    public function test_posisi_zero_when_no_data(): void
    {
        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/setoran-gum/posisi');

        $res->assertOk()
            ->assertJsonPath('total_pengadaan', 0)
            ->assertJsonPath('total_setor',     0)
            ->assertJsonPath('sisa_hutang',     0);
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/keuangan/setoran-gum')->assertUnauthorized();
        $this->getJson('/api/keuangan/setoran-gum/posisi')->assertUnauthorized();
    }
}
