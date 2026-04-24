<?php

namespace Tests\Feature\Sdm;

use App\Enums\UserRole;
use App\Models\Absensi;
use App\Models\Depot;
use App\Models\Karyawan;
use App\Models\TarifUpah;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SdmTest extends TestCase
{
    use RefreshDatabase;

    private User     $kepala;
    private Depot    $depot;
    private Karyawan $karyawan;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot    = Depot::factory()->create();
        $this->kepala   = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);
        $this->karyawan = Karyawan::create([
            'depot_id'     => $this->depot->id,
            'nama'         => 'Ahmad',
            'divisi'       => 'Kandang',
            'berlaku_dari' => '2026-04-01',
        ]);
    }

    private function makeTarif(int $tarifHarian = 150_000, string $berlakuDari = '2026-04-01'): TarifUpah
    {
        return TarifUpah::create([
            'karyawan_id'  => $this->karyawan->id,
            'tarif_harian' => $tarifHarian,
            'berlaku_dari' => $berlakuDari,
            'dibuat_oleh'  => $this->kepala->id,
        ]);
    }

    private function makeAbsensi(string $tgl, string $status = 'HADIR'): void
    {
        Absensi::create([
            'karyawan_id' => $this->karyawan->id,
            'tgl'         => $tgl,
            'status'      => $status,
        ]);
    }

    // ─── tarif ───────────────────────────────────────────────────────────────

    public function test_kepala_can_set_tarif(): void
    {
        $res = $this->actingAs($this->kepala)->postJson('/api/sdm/tarif', [
            'karyawan_id'  => $this->karyawan->id,
            'tarif_harian' => 150_000,
            'berlaku_dari' => '2026-04-01',
        ]);

        $res->assertCreated()->assertJsonPath('tarif.tarif_harian', 150_000);
        $this->assertDatabaseHas('tarif_upah', ['karyawan_id' => $this->karyawan->id, 'tarif_harian' => 150_000]);
    }

    public function test_set_tarif_validates_required_fields(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/sdm/tarif', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['karyawan_id', 'tarif_harian', 'berlaku_dari']);
    }

    public function test_kepala_can_list_active_tarif(): void
    {
        $this->makeTarif(150_000, '2026-04-01');
        $this->makeTarif(160_000, '2026-04-15'); // newer tarif

        $res = $this->actingAs($this->kepala)->getJson('/api/sdm/tarif');

        $res->assertOk()->assertJsonStructure(['data' => [['karyawan_id', 'tarif_harian', 'berlaku_dari', 'karyawan']]]);
        $this->assertCount(1, $res->json('data')); // only latest
        $this->assertEquals(160_000, $res->json('data.0.tarif_harian'));
    }

    // ─── upah calculation ────────────────────────────────────────────────────

    public function test_upah_calculated_correctly(): void
    {
        $this->makeTarif(150_000, '2026-04-01');
        $this->makeAbsensi('2026-04-01', 'HADIR');
        $this->makeAbsensi('2026-04-02', 'HADIR');
        $this->makeAbsensi('2026-04-03', 'TERLAMBAT'); // counts as hadir
        $this->makeAbsensi('2026-04-04', 'TIDAK_HADIR'); // does NOT count

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/sdm/upah?tgl_dari=2026-04-01&tgl_sampai=2026-04-30');

        $res->assertOk()->assertJsonStructure([
            'data' => [['karyawan_id', 'nama', 'divisi', 'hari_hadir', 'tarif_harian', 'total_upah']],
        ]);

        $row = collect($res->json('data'))->firstWhere('karyawan_id', $this->karyawan->id);
        $this->assertEquals(3,       $row['hari_hadir']);
        $this->assertEquals(150_000, $row['tarif_harian']);
        $this->assertEquals(450_000, $row['total_upah']);
    }

    public function test_upah_uses_latest_tarif_on_tgl_sampai(): void
    {
        $this->makeTarif(100_000, '2026-03-01'); // old tarif
        $this->makeTarif(200_000, '2026-04-01'); // new tarif

        $this->makeAbsensi('2026-04-01', 'HADIR');

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/sdm/upah?tgl_dari=2026-04-01&tgl_sampai=2026-04-30');

        $row = collect($res->json('data'))->firstWhere('karyawan_id', $this->karyawan->id);
        $this->assertEquals(200_000, $row['tarif_harian']);
    }

    public function test_upah_scoped_to_own_depot(): void
    {
        $otherDepot    = Depot::factory()->create();
        $otherKaryawan = Karyawan::create(['depot_id' => $otherDepot->id, 'nama' => 'Other', 'divisi' => 'X', 'berlaku_dari' => '2026-04-01']);
        TarifUpah::create(['karyawan_id' => $otherKaryawan->id, 'tarif_harian' => 999_000, 'berlaku_dari' => '2026-04-01']);

        $this->makeTarif(150_000, '2026-04-01');
        $this->makeAbsensi('2026-04-01');

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/sdm/upah?tgl_dari=2026-04-01&tgl_sampai=2026-04-30');

        $ids = collect($res->json('data'))->pluck('karyawan_id');
        $this->assertTrue($ids->contains($this->karyawan->id));
        $this->assertFalse($ids->contains($otherKaryawan->id));
    }

    public function test_upah_requires_date_params(): void
    {
        $this->actingAs($this->kepala)->getJson('/api/sdm/upah')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tgl_dari', 'tgl_sampai']);
    }

    // ─── export ──────────────────────────────────────────────────────────────

    public function test_export_returns_csv(): void
    {
        $this->makeTarif(150_000, '2026-04-01');
        $this->makeAbsensi('2026-04-01');

        $res = $this->actingAs($this->kepala)
            ->get('/api/sdm/upah/export?tgl_dari=2026-04-01&tgl_sampai=2026-04-30');

        $res->assertOk();
        $this->assertStringContainsString('text/csv', $res->headers->get('Content-Type'));
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/sdm/tarif')->assertUnauthorized();
        $this->getJson('/api/sdm/upah')->assertUnauthorized();
    }
}
