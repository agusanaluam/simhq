<?php

namespace Tests\Feature\Pengiriman;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\Pengiriman;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PengirimanTest extends TestCase
{
    use RefreshDatabase;

    private User  $logistik;
    private Depot $depot;
    private int   $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot    = Depot::factory()->create();
        $this->logistik = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::LOGISTIK_KETUA,
        ]);
    }

    private function makePengiriman(array $attrs = []): Pengiriman
    {
        $this->seq++;
        return Pengiriman::create(array_merge([
            'depot_id'      => $this->depot->id,
            'nama_penerima' => "Pembeli {$this->seq}",
            'alamat'        => 'Jl. Test No. 1',
            'no_hp1'        => '081234567890',
            'tgl_kirim'     => '2026-06-01',
            'sesi'          => 'PAGI',
            'status'        => 'DIJADWALKAN',
        ], $attrs));
    }

    // ─── create ──────────────────────────────────────────────────────────────

    public function test_logistik_can_create_pengiriman(): void
    {
        $res = $this->actingAs($this->logistik)->postJson('/api/pengiriman', [
            'nama_penerima' => 'Ahmad Fauzi',
            'alamat'        => 'Jl. Mawar 5',
            'no_hp1'        => '081234567890',
            'tgl_kirim'     => '2026-06-01',
            'sesi'          => 'PAGI',
        ]);

        $res->assertCreated()->assertJsonPath('pengiriman.nama_penerima', 'Ahmad Fauzi');
        $this->assertDatabaseHas('pengiriman', [
            'nama_penerima' => 'Ahmad Fauzi',
            'status'        => 'DIJADWALKAN',
            'depot_id'      => $this->depot->id,
        ]);
    }

    public function test_create_validates_required_fields(): void
    {
        $this->actingAs($this->logistik)->postJson('/api/pengiriman', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nama_penerima', 'alamat', 'no_hp1', 'tgl_kirim', 'sesi']);
    }

    public function test_create_rejects_invalid_sesi(): void
    {
        $this->actingAs($this->logistik)->postJson('/api/pengiriman', [
            'nama_penerima' => 'Test', 'alamat' => 'Jl. A',
            'no_hp1' => '081', 'tgl_kirim' => '2026-06-01', 'sesi' => 'DINI_HARI',
        ])->assertUnprocessable()->assertJsonValidationErrors(['sesi']);
    }

    // ─── list ────────────────────────────────────────────────────────────────

    public function test_logistik_can_list_pengiriman(): void
    {
        $this->makePengiriman();
        $this->makePengiriman(['sesi' => 'SORE']);

        $res = $this->actingAs($this->logistik)->getJson('/api/pengiriman');

        $res->assertOk()->assertJsonStructure([
            'data' => [['id', 'nama_penerima', 'sesi', 'status', 'tgl_kirim']],
        ]);
        $this->assertCount(2, $res->json('data'));
    }

    public function test_list_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        Pengiriman::create([
            'depot_id' => $otherDepot->id, 'nama_penerima' => 'Other',
            'alamat' => 'X', 'no_hp1' => '0800', 'tgl_kirim' => '2026-06-01', 'sesi' => 'PAGI',
        ]);
        $this->makePengiriman();

        $res = $this->actingAs($this->logistik)->getJson('/api/pengiriman');

        $this->assertCount(1, $res->json('data'));
    }

    public function test_list_filterable_by_tgl_dan_sesi(): void
    {
        $this->makePengiriman(['tgl_kirim' => '2026-06-01', 'sesi' => 'PAGI']);
        $this->makePengiriman(['tgl_kirim' => '2026-06-01', 'sesi' => 'SORE']);
        $this->makePengiriman(['tgl_kirim' => '2026-06-02', 'sesi' => 'PAGI']);

        $res = $this->actingAs($this->logistik)
            ->getJson('/api/pengiriman?tgl=2026-06-01&sesi=PAGI');

        $this->assertCount(1, $res->json('data'));
    }

    // ─── update status ────────────────────────────────────────────────────────

    public function test_logistik_can_update_status(): void
    {
        $p = $this->makePengiriman();

        $res = $this->actingAs($this->logistik)
            ->putJson("/api/pengiriman/{$p->id}/status", ['status' => 'DIAMBIL']);

        $res->assertOk()->assertJsonPath('pengiriman.status', 'DIAMBIL');
        $this->assertDatabaseHas('pengiriman', ['id' => $p->id, 'status' => 'DIAMBIL']);
    }

    public function test_update_status_sets_tgl_berangkat_when_dalam_perjalanan(): void
    {
        $p = $this->makePengiriman();

        $this->actingAs($this->logistik)
            ->putJson("/api/pengiriman/{$p->id}/status", ['status' => 'DALAM_PERJALANAN']);

        $this->assertNotNull(Pengiriman::find($p->id)->tgl_berangkat);
    }

    public function test_update_status_sets_tgl_sampai_when_terkirim(): void
    {
        $p = $this->makePengiriman();

        $this->actingAs($this->logistik)
            ->putJson("/api/pengiriman/{$p->id}/status", ['status' => 'TERKIRIM']);

        $this->assertNotNull(Pengiriman::find($p->id)->tgl_sampai);
    }

    public function test_cannot_update_other_depots_pengiriman(): void
    {
        $otherDepot = Depot::factory()->create();
        $p = Pengiriman::create([
            'depot_id' => $otherDepot->id, 'nama_penerima' => 'Other',
            'alamat' => 'X', 'no_hp1' => '0800', 'tgl_kirim' => '2026-06-01', 'sesi' => 'PAGI',
        ]);

        $this->actingAs($this->logistik)
            ->putJson("/api/pengiriman/{$p->id}/status", ['status' => 'DIAMBIL'])
            ->assertForbidden();
    }

    // ─── rekap ───────────────────────────────────────────────────────────────

    public function test_rekap_returns_summary_per_sesi(): void
    {
        $this->makePengiriman(['tgl_kirim' => '2026-06-01', 'sesi' => 'PAGI', 'status' => 'DIJADWALKAN']);
        $this->makePengiriman(['tgl_kirim' => '2026-06-01', 'sesi' => 'PAGI', 'status' => 'TERKIRIM']);
        $this->makePengiriman(['tgl_kirim' => '2026-06-01', 'sesi' => 'SORE', 'status' => 'DIJADWALKAN']);

        $res = $this->actingAs($this->logistik)
            ->getJson('/api/pengiriman/rekap?tgl=2026-06-01');

        $res->assertOk()->assertJsonStructure(['data' => [['sesi', 'total', 'terkirim', 'belum']]]);

        $pagi = collect($res->json('data'))->firstWhere('sesi', 'PAGI');
        $this->assertEquals(2, $pagi['total']);
        $this->assertEquals(1, $pagi['terkirim']);
        $this->assertEquals(1, $pagi['belum']);
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/pengiriman')->assertUnauthorized();
        $this->postJson('/api/pengiriman', [])->assertUnauthorized();
    }
}
