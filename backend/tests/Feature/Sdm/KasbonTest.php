<?php

namespace Tests\Feature\Sdm;

use App\Enums\UserRole;
use App\Models\CicilanKasbon;
use App\Models\Depot;
use App\Models\Kasbon;
use App\Models\Karyawan;
use App\Models\TarifUpah;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KasbonTest extends TestCase
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

    private function makeKasbon(string $status = 'PENDING', int $nominal = 500_000): Kasbon
    {
        return Kasbon::create([
            'karyawan_id' => $this->karyawan->id,
            'depot_id'    => $this->depot->id,
            'nominal'     => $nominal,
            'alasan'      => 'Kebutuhan mendesak',
            'status'      => $status,
        ]);
    }

    // ─── submit ──────────────────────────────────────────────────────────────

    public function test_kepala_can_submit_kasbon_for_karyawan(): void
    {
        $res = $this->actingAs($this->kepala)->postJson('/api/sdm/kasbon', [
            'karyawan_id' => $this->karyawan->id,
            'nominal'     => 500_000,
            'alasan'      => 'Kebutuhan mendesak',
        ]);

        $res->assertCreated()->assertJsonPath('kasbon.status', 'PENDING');
        $this->assertDatabaseHas('kasbon', [
            'karyawan_id' => $this->karyawan->id,
            'status'      => 'PENDING',
        ]);
    }

    public function test_submit_validates_required_fields(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/sdm/kasbon', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['karyawan_id', 'nominal', 'alasan']);
    }

    // ─── list ────────────────────────────────────────────────────────────────

    public function test_kepala_can_list_kasbon(): void
    {
        $this->makeKasbon('PENDING');
        $this->makeKasbon('APPROVED');

        $res = $this->actingAs($this->kepala)->getJson('/api/sdm/kasbon');

        $res->assertOk()->assertJsonStructure([
            'data' => [['id', 'nominal', 'alasan', 'status', 'karyawan']],
        ]);
        $this->assertCount(2, $res->json('data'));
    }

    public function test_list_filterable_by_status(): void
    {
        $this->makeKasbon('PENDING');
        $this->makeKasbon('APPROVED');

        $res = $this->actingAs($this->kepala)->getJson('/api/sdm/kasbon?status=PENDING');

        $this->assertCount(1, $res->json('data'));
        $this->assertEquals('PENDING', $res->json('data.0.status'));
    }

    public function test_list_scoped_to_own_depot(): void
    {
        $otherDepot    = Depot::factory()->create();
        $otherKaryawan = Karyawan::create(['depot_id' => $otherDepot->id, 'nama' => 'Other', 'divisi' => 'X', 'berlaku_dari' => '2026-04-01']);
        Kasbon::create(['karyawan_id' => $otherKaryawan->id, 'depot_id' => $otherDepot->id,
            'nominal' => 1_000_000, 'alasan' => 'Other', 'status' => 'PENDING']);
        $this->makeKasbon();

        $res = $this->actingAs($this->kepala)->getJson('/api/sdm/kasbon');

        $this->assertCount(1, $res->json('data'));
    }

    // ─── approve ─────────────────────────────────────────────────────────────

    public function test_kepala_can_approve_kasbon(): void
    {
        $kasbon = $this->makeKasbon('PENDING');

        $res = $this->actingAs($this->kepala)
            ->putJson("/api/sdm/kasbon/{$kasbon->id}/approve", [
                'nominal_cicilan' => 100_000,
                'jumlah_cicil'    => 5,
                'tgl_mulai'       => today()->toDateString(),
            ]);

        $res->assertOk()->assertJsonPath('kasbon.status', 'APPROVED');
        $this->assertDatabaseHas('kasbon', ['id' => $kasbon->id, 'status' => 'APPROVED']);
        $this->assertDatabaseHas('cicilan_kasbon', [
            'kasbon_id'       => $kasbon->id,
            'nominal_cicilan' => 100_000,
            'jumlah_cicil'    => 5,
        ]);
    }

    public function test_approve_validates_cicilan_fields(): void
    {
        $kasbon = $this->makeKasbon('PENDING');

        $this->actingAs($this->kepala)
            ->putJson("/api/sdm/kasbon/{$kasbon->id}/approve", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nominal_cicilan', 'jumlah_cicil', 'tgl_mulai']);
    }

    // ─── reject ──────────────────────────────────────────────────────────────

    public function test_kepala_can_reject_kasbon(): void
    {
        $kasbon = $this->makeKasbon('PENDING');

        $res = $this->actingAs($this->kepala)
            ->putJson("/api/sdm/kasbon/{$kasbon->id}/reject");

        $res->assertOk()->assertJsonPath('kasbon.status', 'REJECTED');
    }

    // ─── upah integration ────────────────────────────────────────────────────

    public function test_upah_includes_potongan_kasbon(): void
    {
        TarifUpah::create([
            'karyawan_id'  => $this->karyawan->id,
            'tarif_harian' => 100_000,
            'berlaku_dari' => '2026-04-01',
            'dibuat_oleh'  => $this->kepala->id,
        ]);

        $kasbon = $this->makeKasbon('APPROVED');
        CicilanKasbon::create([
            'kasbon_id'       => $kasbon->id,
            'nominal_cicilan' => 200_000,
            'jumlah_cicil'    => 3,
            'cicil_terbayar'  => 0,
            'tgl_mulai'       => '2026-04-01',
        ]);

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/sdm/upah?tgl_dari=2026-04-01&tgl_sampai=2026-04-30');

        $res->assertOk();
        $row = collect($res->json('data'))->firstWhere('karyawan_id', $this->karyawan->id);
        $this->assertArrayHasKey('potongan_kasbon', $row);
        $this->assertEquals(200_000, $row['potongan_kasbon']);
        $this->assertArrayHasKey('upah_bersih', $row);
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/sdm/kasbon')->assertUnauthorized();
        $this->postJson('/api/sdm/kasbon', [])->assertUnauthorized();
    }
}
