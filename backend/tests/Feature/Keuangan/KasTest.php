<?php
namespace Tests\Feature\Keuangan;

use App\Enums\TipeKas;
use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\KasHarian;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KasTest extends TestCase
{
    use RefreshDatabase;

    private User $kepala;
    private Depot $depot;
    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot  = Depot::factory()->create();
        $this->kepala = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);
    }

    private function makeKas(array $attrs = []): KasHarian
    {
        $this->seq++;
        return KasHarian::create(array_merge([
            'depot_id'      => $this->depot->id,
            'tipe'          => 'MASUK',
            'sumber'        => 'DEPOSIT',
            'divisi'        => null,
            'keterangan'    => "Kas #{$this->seq}",
            'jumlah'        => 1_000_000,
            'metode'        => 'CASH',
            'tgl_transaksi' => today()->toDateString(),
            'input_by'      => $this->kepala->id,
            'transaksi_id'  => null,
        ], $attrs));
    }

    public function test_kepala_can_list_kas_entries(): void
    {
        $this->makeKas();
        $this->makeKas(['tipe' => 'KELUAR', 'sumber' => null, 'divisi' => 'ADMIN', 'jumlah' => 500_000]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/kas');

        $res->assertOk()
            ->assertJsonStructure([
                'entries' => ['data', 'total', 'per_page', 'current_page'],
                'summary' => ['total_masuk', 'total_keluar', 'saldo', 'per_metode'],
            ]);

        $this->assertCount(2, $res->json('entries.data'));
        $this->assertEquals(1_000_000, $res->json('summary.total_masuk'));
        $this->assertEquals(500_000,   $res->json('summary.total_keluar'));
        $this->assertEquals(500_000,   $res->json('summary.saldo'));
    }

    public function test_list_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        $this->makeKas();
        KasHarian::create([
            'depot_id' => $otherDepot->id, 'tipe' => 'MASUK', 'sumber' => 'DEPOSIT',
            'divisi' => null, 'keterangan' => 'Other', 'jumlah' => 999_000,
            'metode' => 'CASH', 'tgl_transaksi' => today()->toDateString(),
        ]);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/kas');

        $this->assertCount(1, $res->json('entries.data'));
    }

    public function test_list_filter_by_divisi(): void
    {
        $this->makeKas(['tipe' => 'KELUAR', 'sumber' => null, 'divisi' => 'ADMIN']);
        $this->makeKas(['tipe' => 'KELUAR', 'sumber' => null, 'divisi' => 'LOGISTIK']);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/kas?divisi=ADMIN');

        $this->assertCount(1, $res->json('entries.data'));
        $this->assertEquals('ADMIN', $res->json('entries.data.0.divisi'));
    }

    public function test_list_filter_by_date_range(): void
    {
        $this->makeKas(['tgl_transaksi' => '2026-04-01']);
        $this->makeKas(['tgl_transaksi' => '2026-04-15']);
        $this->makeKas(['tgl_transaksi' => '2026-04-30']);

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/keuangan/kas?tgl_dari=2026-04-10&tgl_sampai=2026-04-20');

        $this->assertCount(1, $res->json('entries.data'));
    }

    public function test_can_create_kas_masuk(): void
    {
        $res = $this->actingAs($this->kepala)->postJson('/api/keuangan/kas', [
            'tipe'          => 'MASUK',
            'sumber'        => 'DEPOSIT',
            'keterangan'    => 'Setoran tunai',
            'jumlah'        => 3_000_000,
            'metode'        => 'CASH',
            'tgl_transaksi' => today()->toDateString(),
        ]);

        $res->assertCreated()->assertJsonPath('kas.tipe', 'MASUK');
        $this->assertDatabaseHas('kas_harian', ['keterangan' => 'Setoran tunai', 'jumlah' => 3_000_000]);
    }

    public function test_can_create_kas_keluar(): void
    {
        $res = $this->actingAs($this->kepala)->postJson('/api/keuangan/kas', [
            'tipe'          => 'KELUAR',
            'divisi'        => 'LOGISTIK',
            'keterangan'    => 'Bensin truk',
            'jumlah'        => 200_000,
            'metode'        => 'CASH',
            'tgl_transaksi' => today()->toDateString(),
        ]);

        $res->assertCreated()->assertJsonPath('kas.tipe', 'KELUAR');
        $this->assertDatabaseHas('kas_harian', ['divisi' => 'LOGISTIK', 'jumlah' => 200_000]);
    }

    public function test_create_validates_required_fields(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/kas', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tipe', 'keterangan', 'jumlah', 'metode', 'tgl_transaksi']);
    }

    public function test_masuk_requires_sumber(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/kas', [
            'tipe' => 'MASUK', 'keterangan' => 'Test', 'jumlah' => 100_000,
            'metode' => 'CASH', 'tgl_transaksi' => today()->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors(['sumber']);
    }

    public function test_keluar_requires_divisi(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/keuangan/kas', [
            'tipe' => 'KELUAR', 'keterangan' => 'Test', 'jumlah' => 100_000,
            'metode' => 'CASH', 'tgl_transaksi' => today()->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors(['divisi']);
    }

    public function test_saldo_is_masuk_minus_keluar_up_to_date(): void
    {
        $this->makeKas(['jumlah' => 5_000_000, 'tgl_transaksi' => '2026-04-01']);
        $this->makeKas(['tipe' => 'KELUAR', 'sumber' => null, 'divisi' => 'ADMIN', 'jumlah' => 2_000_000, 'tgl_transaksi' => '2026-04-10']);
        $this->makeKas(['jumlah' => 1_000_000, 'tgl_transaksi' => '2026-04-20']);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/saldo?tgl=2026-04-15');

        $res->assertOk()
            ->assertJsonPath('total_masuk', 5_000_000)
            ->assertJsonPath('total_keluar', 2_000_000)
            ->assertJsonPath('saldo', 3_000_000);
    }

    public function test_cashflow_returns_daily_aggregation(): void
    {
        $this->makeKas(['jumlah' => 3_000_000, 'tgl_transaksi' => '2026-04-01']);
        $this->makeKas(['tipe' => 'KELUAR', 'sumber' => null, 'divisi' => 'ADMIN', 'jumlah' => 1_000_000, 'tgl_transaksi' => '2026-04-01']);
        $this->makeKas(['jumlah' => 2_000_000, 'tgl_transaksi' => '2026-04-02']);

        $res = $this->actingAs($this->kepala)->getJson('/api/keuangan/cashflow?bulan=2026-04');

        $res->assertOk()->assertJsonStructure(['data' => [['tanggal', 'masuk', 'keluar']]]);

        $day1 = collect($res->json('data'))->firstWhere('tanggal', '2026-04-01');
        $this->assertEquals(3_000_000, $day1['masuk']);
        $this->assertEquals(1_000_000, $day1['keluar']);
    }

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/keuangan/kas')->assertUnauthorized();
    }
}
