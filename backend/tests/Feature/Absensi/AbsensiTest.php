<?php
namespace Tests\Feature\Absensi;

use App\Models\Absensi;
use App\Models\Depot;
use App\Models\JamKerjaDefault;
use App\Models\Karyawan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AbsensiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $staff;
    private Karyawan $karyawan;
    private Depot $depot;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin  = User::factory()->superAdmin()->create();
        $this->depot  = Depot::factory()->create();
        $this->staff  = User::factory()->create(['depot_id' => $this->depot->id]);

        $this->karyawan = Karyawan::create([
            'user_id'     => $this->staff->id,
            'depot_id'    => $this->depot->id,
            'nama'        => 'Budi',
            'divisi'      => 'Kandang',
            'tarif_harian'=> 100000,
            'berlaku_dari'=> '2026-01-01',
        ]);

        JamKerjaDefault::create([
            'depot_id'        => $this->depot->id,
            'divisi'          => 'Kandang',
            'jam_masuk'       => '07:00:00',
            'jam_keluar'      => '16:00:00',
            'toleransi_menit' => 15,
        ]);
    }

    public function test_checkin_creates_absensi(): void
    {
        $this->actingAs($this->staff)
            ->postJson('/api/absensi/checkin', ['catatan' => null])
            ->assertCreated()
            ->assertJsonStructure(['absensi' => ['id', 'tgl', 'jam_masuk', 'status']]);

        $this->assertDatabaseHas('absensi', ['karyawan_id' => $this->karyawan->id]);
    }

    public function test_checkin_tidak_bisa_dua_kali(): void
    {
        Absensi::create([
            'karyawan_id' => $this->karyawan->id,
            'tgl'         => today(),
            'jam_masuk'   => '07:05:00',
            'status'      => 'HADIR',
        ]);

        $this->actingAs($this->staff)
            ->postJson('/api/absensi/checkin')
            ->assertUnprocessable();
    }

    public function test_manual_override_terlambat(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/absensi/manual', [
                'karyawan_id' => $this->karyawan->id,
                'tgl'         => today()->toDateString(),
                'jam_masuk'   => '08:00:00',
                'status'      => 'TERLAMBAT',
            ])
            ->assertCreated()
            ->assertJsonPath('absensi.status', 'TERLAMBAT');
    }

    public function test_checkout_updates_durasi(): void
    {
        Absensi::create([
            'karyawan_id' => $this->karyawan->id,
            'tgl'         => today(),
            'jam_masuk'   => '07:00:00',
            'status'      => 'HADIR',
        ]);

        $this->actingAs($this->staff)
            ->postJson('/api/absensi/checkout')
            ->assertOk()
            ->assertJsonStructure(['absensi' => ['jam_keluar', 'durasi']]);

        $this->assertDatabaseHas('absensi', [
            'karyawan_id' => $this->karyawan->id,
            'tgl'         => today()->toDateString(),
        ]);
    }

    public function test_hari_ini_returns_status(): void
    {
        Absensi::create([
            'karyawan_id' => $this->karyawan->id,
            'tgl'         => today(),
            'jam_masuk'   => '07:05:00',
            'status'      => 'HADIR',
        ]);

        $this->actingAs($this->staff)
            ->getJson('/api/absensi/hari-ini')
            ->assertOk()
            ->assertJsonPath('absensi.status', 'HADIR');
    }

    public function test_hari_ini_belum_absen(): void
    {
        $this->actingAs($this->staff)
            ->getJson('/api/absensi/hari-ini')
            ->assertOk()
            ->assertJsonPath('absensi', null);
    }

    public function test_rekap_absensi(): void
    {
        Absensi::create([
            'karyawan_id' => $this->karyawan->id,
            'tgl'         => today(),
            'jam_masuk'   => '07:05:00',
            'status'      => 'HADIR',
        ]);

        $this->actingAs($this->admin)
            ->getJson("/api/absensi/rekap?depot={$this->depot->id}&bulan=" . today()->format('Y-m'))
            ->assertOk()
            ->assertJsonStructure(['data' => [['karyawan_id', 'nama', 'hadir', 'terlambat', 'tidak_hadir']]]);
    }
}
