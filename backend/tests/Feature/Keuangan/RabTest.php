<?php

namespace Tests\Feature\Keuangan;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\Rab;
use App\Models\RabKategori;
use App\Models\RealisasiPengeluaran;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RabTest extends TestCase
{
    use RefreshDatabase;

    private User        $kepala;
    private Depot       $depot;
    private RabKategori $kategori;
    private int         $musim = 2026;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot    = Depot::factory()->create();
        $this->kepala   = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);
        $this->kategori = RabKategori::create(['nama' => 'LOGISTIK', 'is_active' => true]);
    }

    private function makeRab(RabKategori $kategori = null, int $anggaran = 10_000_000): Rab
    {
        $kategori ??= $this->kategori;
        return Rab::create([
            'depot_id'        => $this->depot->id,
            'kategori_id'     => $kategori->id,
            'musim'           => $this->musim,
            'jumlah_anggaran' => $anggaran,
            'created_by'      => $this->kepala->id,
        ]);
    }

    private function makeRealisasi(Rab $rab, int $jumlah = 2_000_000): RealisasiPengeluaran
    {
        return RealisasiPengeluaran::create([
            'rab_id'          => $rab->id,
            'keterangan'      => 'Pembelian bahan',
            'jumlah'          => $jumlah,
            'tgl_pengeluaran' => today()->toDateString(),
            'input_by'        => $this->kepala->id,
        ]);
    }

    // ─── summary ─────────────────────────────────────────────────────────────

    public function test_summary_returns_rab_list_with_kategori(): void
    {
        $this->makeRab($this->kategori, 10_000_000);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/keuangan/rab/summary?musim={$this->musim}");

        $res->assertOk()
            ->assertJsonStructure([
                'musim',
                'data' => [['rab_id', 'kategori_id', 'kategori', 'jumlah_anggaran', 'total_realisasi', 'selisih', 'persen_terpakai']],
            ]);

        $this->assertCount(1, $res->json('data'));
        $this->assertEquals($this->musim, $res->json('musim'));
    }

    public function test_summary_shows_correct_totals(): void
    {
        $rab = $this->makeRab($this->kategori, 10_000_000);
        $this->makeRealisasi($rab, 3_000_000);
        $this->makeRealisasi($rab, 2_000_000);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/keuangan/rab/summary?musim={$this->musim}");

        $row = collect($res->json('data'))->firstWhere('kategori', 'LOGISTIK');

        $this->assertEquals(10_000_000, $row['jumlah_anggaran']);
        $this->assertEquals(5_000_000,  $row['total_realisasi']);
        $this->assertEquals(5_000_000,  $row['selisih']);
        $this->assertEquals(50.0,       $row['persen_terpakai']);
    }

    public function test_summary_empty_when_no_rabs(): void
    {
        $res = $this->actingAs($this->kepala)
            ->getJson("/api/keuangan/rab/summary?musim={$this->musim}");

        $res->assertOk();
        $this->assertCount(0, $res->json('data'));
    }

    public function test_summary_scoped_to_own_depot(): void
    {
        $otherDepot    = Depot::factory()->create();
        $adminKategori = RabKategori::create(['nama' => 'ADMIN', 'is_active' => true]);
        Rab::create([
            'depot_id'        => $otherDepot->id,
            'kategori_id'     => $adminKategori->id,
            'musim'           => $this->musim,
            'jumlah_anggaran' => 99_000_000,
        ]);
        $this->makeRab($this->kategori, 10_000_000);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/keuangan/rab/summary?musim={$this->musim}");

        // Only own depot's RAB returned
        $this->assertCount(1, $res->json('data'));
        $this->assertEquals(10_000_000, $res->json('data.0.jumlah_anggaran'));
    }

    // ─── store RAB ────────────────────────────────────────────────────────────

    public function test_kepala_can_create_rab(): void
    {
        $res = $this->actingAs($this->kepala)->postJson('/api/keuangan/rab', [
            'kategori_id'     => $this->kategori->id,
            'musim'           => $this->musim,
            'jumlah_anggaran' => 15_000_000,
        ]);

        $res->assertCreated()->assertJsonPath('rab.kategori_id', $this->kategori->id);
        $this->assertDatabaseHas('rab', ['kategori_id' => $this->kategori->id, 'jumlah_anggaran' => 15_000_000]);
    }

    public function test_store_rab_updates_existing_same_kategori_musim(): void
    {
        $this->makeRab($this->kategori, 10_000_000);

        $res = $this->actingAs($this->kepala)->postJson('/api/keuangan/rab', [
            'kategori_id'     => $this->kategori->id,
            'musim'           => $this->musim,
            'jumlah_anggaran' => 20_000_000,
        ]);

        $res->assertOk()->assertJsonPath('rab.jumlah_anggaran', 20_000_000);
        $this->assertDatabaseCount('rab', 1);
    }

    public function test_store_rab_validates_required_fields(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/rab', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['kategori_id', 'musim', 'jumlah_anggaran']);
    }

    public function test_store_rab_rejects_nonexistent_kategori(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/rab', [
            'kategori_id' => 99999, 'musim' => $this->musim, 'jumlah_anggaran' => 1_000_000,
        ])->assertUnprocessable()->assertJsonValidationErrors(['kategori_id']);
    }

    // ─── realisasi ───────────────────────────────────────────────────────────

    public function test_kepala_can_add_realisasi(): void
    {
        $rab = $this->makeRab();

        $res = $this->actingAs($this->kepala)
            ->postJson("/api/keuangan/rab/{$rab->id}/realisasi", [
                'keterangan'      => 'Sewa truk',
                'jumlah'          => 3_000_000,
                'tgl_pengeluaran' => today()->toDateString(),
            ]);

        $res->assertCreated()->assertJsonPath('realisasi.jumlah', 3_000_000);
        $this->assertDatabaseHas('realisasi_pengeluaran', [
            'jumlah' => 3_000_000, 'keterangan' => 'Sewa truk',
        ]);
    }

    public function test_realisasi_auto_creates_kas_harian_keluar(): void
    {
        $rab = $this->makeRab($this->kategori, 10_000_000);

        $this->actingAs($this->kepala)
            ->postJson("/api/keuangan/rab/{$rab->id}/realisasi", [
                'keterangan'      => 'Sewa truk',
                'jumlah'          => 3_000_000,
                'tgl_pengeluaran' => today()->toDateString(),
            ]);

        $this->assertDatabaseHas('kas_harian', [
            'depot_id' => $this->depot->id,
            'tipe'     => 'KELUAR',
            'divisi'   => 'LOGISTIK',
            'jumlah'   => 3_000_000,
            'rab_id'   => null,
        ]);
    }

    public function test_realisasi_validates_required_fields(): void
    {
        $rab = $this->makeRab();

        $this->actingAs($this->kepala)
            ->postJson("/api/keuangan/rab/{$rab->id}/realisasi", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['keterangan', 'jumlah', 'tgl_pengeluaran']);
    }

    public function test_cannot_add_realisasi_to_other_depots_rab(): void
    {
        $otherDepot = Depot::factory()->create();
        $otherRab   = Rab::create([
            'depot_id'    => $otherDepot->id,
            'kategori_id' => $this->kategori->id,
            'musim'       => $this->musim,
            'jumlah_anggaran' => 5_000_000,
        ]);

        $this->actingAs($this->kepala)
            ->postJson("/api/keuangan/rab/{$otherRab->id}/realisasi", [
                'keterangan' => 'Test', 'jumlah' => 1_000_000,
                'tgl_pengeluaran' => today()->toDateString(),
            ])
            ->assertForbidden();
    }

    public function test_kepala_can_list_realisasi(): void
    {
        $rab = $this->makeRab();
        $this->makeRealisasi($rab, 1_000_000);
        $this->makeRealisasi($rab, 2_000_000);

        $res = $this->actingAs($this->kepala)
            ->getJson("/api/keuangan/rab/{$rab->id}/realisasi");

        $res->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'keterangan', 'jumlah', 'tgl_pengeluaran']],
                'rab',
            ]);
        $this->assertCount(2, $res->json('data'));
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/keuangan/rab/summary')->assertUnauthorized();
        $this->postJson('/api/keuangan/rab', [])->assertUnauthorized();
    }
}
