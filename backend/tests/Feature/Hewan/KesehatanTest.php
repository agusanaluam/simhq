<?php

namespace Tests\Feature\Hewan;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\KematianHewan;
use App\Models\RiwayatHewan;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class KesehatanTest extends TestCase
{
    use RefreshDatabase;

    private User  $kandang;
    private Depot $depot;
    private Hewan $hewan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->depot   = Depot::factory()->create();
        $this->kandang = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KANDANG_SAPI_KETUA,
        ]);

        $kelas       = KelasHewan::create(['kode' => 'A', 'nama' => 'Kelas A', 'urutan' => 1]);
        $supplier    = Supplier::create(['nama' => 'GUM', 'is_gum' => true, 'is_active' => true]);
        $this->hewan = Hewan::create([
            'depot_id'      => $this->depot->id,
            'supplier_id'   => $supplier->id,
            'kelas_asal_id' => $kelas->id,
            'kelas_jual_id' => $kelas->id,
            'no_hewan'      => '001',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300.00,
            'tgl_masuk'     => today()->toDateString(),
            'musim'         => (int) date('Y'),
            'status'        => 'AVAILABLE',
        ]);
    }

    // ─── riwayat ─────────────────────────────────────────────────────────────

    public function test_kandang_can_add_riwayat_harian(): void
    {
        $res = $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/riwayat", [
                'tgl'     => today()->toDateString(),
                'kondisi' => 'SEHAT',
                'bobot'   => 310.50,
                'catatan' => 'Nafsu makan baik',
            ]);

        $res->assertCreated()->assertJsonPath('riwayat.kondisi', 'SEHAT');
        $this->assertDatabaseHas('riwayat_hewan', [
            'hewan_id' => $this->hewan->id,
            'kondisi'  => 'SEHAT',
        ]);
    }

    public function test_riwayat_validates_required_fields(): void
    {
        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/riwayat", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tgl', 'kondisi']);
    }

    public function test_riwayat_kritis_triggers_wa_alert(): void
    {
        Http::fake(['*' => Http::response([], 200)]);
        config(['services.waha.url' => 'http://localhost:3000']);

        User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
            'phone'    => '081234567890',
        ]);

        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/riwayat", [
                'tgl'     => today()->toDateString(),
                'kondisi' => 'KRITIS',
                'catatan' => 'Tidak mau makan',
            ]);

        $this->assertDatabaseHas('wa_log', ['triggered_by' => 'hewan_kritis']);
    }

    public function test_kandang_can_list_riwayat(): void
    {
        RiwayatHewan::create([
            'hewan_id'  => $this->hewan->id,
            'tgl'       => today()->toDateString(),
            'kondisi'   => 'SEHAT',
            'petugas_id' => $this->kandang->id,
        ]);

        $res = $this->actingAs($this->kandang)
            ->getJson("/api/hewan/{$this->hewan->id}/riwayat");

        $res->assertOk()->assertJsonStructure(['data' => [['id', 'tgl', 'kondisi']]]);
        $this->assertCount(1, $res->json('data'));
    }

    // ─── kematian ─────────────────────────────────────────────────────────────

    public function test_kandang_can_record_kematian(): void
    {
        Http::fake(['*' => Http::response([], 200)]);
        config(['services.waha.url' => 'http://localhost:3000']);

        User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
            'phone'    => '081234567890',
        ]);

        $res = $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/kematian", [
                'tgl'      => today()->toDateString(),
                'penyebab' => 'Penyakit pernapasan',
            ]);

        $res->assertCreated()->assertJsonPath('kematian.penyebab', 'Penyakit pernapasan');
        $this->assertDatabaseHas('kematian_hewan', ['hewan_id' => $this->hewan->id]);
    }

    public function test_kematian_updates_hewan_status_to_mati(): void
    {
        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/kematian", [
                'tgl'      => today()->toDateString(),
                'penyebab' => 'Sakit',
            ]);

        $this->assertEquals('MATI', Hewan::find($this->hewan->id)->status->value);
    }

    public function test_kematian_validates_required_fields(): void
    {
        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/kematian", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tgl', 'penyebab']);
    }

    // ─── mortalitas ──────────────────────────────────────────────────────────

    public function test_mortalitas_returns_correct_summary(): void
    {
        $this->hewan->update(['status' => 'MATI']);

        $res = $this->actingAs($this->kandang)
            ->getJson('/api/hewan/mortalitas?musim=' . date('Y'));

        $res->assertOk()->assertJsonStructure([
            'data' => [['jenis', 'total_hewan', 'total_mati', 'rasio_mortalitas']],
            'musim',
        ]);

        $sapi = collect($res->json('data'))->firstWhere('jenis', 'SAPI');
        $this->assertEquals(1, $sapi['total_mati']);
    }

    public function test_mortalitas_scoped_to_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        $kelas      = KelasHewan::first();
        $supplier   = Supplier::first();

        Hewan::create([
            'depot_id' => $otherDepot->id, 'supplier_id' => $supplier->id,
            'kelas_asal_id' => $kelas->id, 'kelas_jual_id' => $kelas->id,
            'no_hewan' => '001', 'jenis' => 'SAPI', 'bobot_masuk' => 200,
            'tgl_masuk' => today()->toDateString(), 'musim' => (int) date('Y'), 'status' => 'MATI',
        ]);

        $res = $this->actingAs($this->kandang)
            ->getJson('/api/hewan/mortalitas?musim=' . date('Y'));

        $sapi = collect($res->json('data'))->firstWhere('jenis', 'SAPI');
        $this->assertEquals(0, $sapi['total_mati'] ?? 0);
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson("/api/hewan/{$this->hewan->id}/riwayat")->assertUnauthorized();
        $this->getJson('/api/hewan/mortalitas')->assertUnauthorized();
    }
}
