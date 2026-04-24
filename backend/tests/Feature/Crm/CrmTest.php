<?php

namespace Tests\Feature\Crm;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\LogInteraksi;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrmTest extends TestCase
{
    use RefreshDatabase;

    private User     $cs;
    private Depot    $depot;
    private Customer $customer;
    private int      $musim;
    private int      $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot    = Depot::factory()->create();
        $this->cs       = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::CS_KETUA,
        ]);
        $this->customer = Customer::create([
            'nama' => 'Ahmad Fauzi', 'hp' => '081234567890',
            'alamat' => 'Jl. Mawar 1', 'kota' => 'Bandung',
        ]);
        $this->musim = (int) date('Y');

        // KelasHewan needed for Transaksi FK
        KelasHewan::create(['kode' => 'A', 'nama' => 'Kelas A', 'urutan' => 1]);
    }

    private function makeTransaksi(int $musim): Transaksi
    {
        $this->seq++;
        return Transaksi::create([
            'depot_id'         => $this->depot->id,
            'no_faktur'        => "FAK-{$this->seq}",
            'customer_id'      => $this->customer->id,
            'tipe_qurban'      => 'SHQ',
            'jenis'            => 'SAPI',
            'kelas_id'         => KelasHewan::first()->id,
            'harga'            => 10_000_000,
            'total'            => 10_000_000,
            'status_transaksi' => 'SELESAI',
            'musim'            => $musim,
        ]);
    }

    // ─── list customers ──────────────────────────────────────────────────────

    public function test_cs_can_list_customers(): void
    {
        $res = $this->actingAs($this->cs)->getJson('/api/crm/customer');

        $res->assertOk()->assertJsonStructure(['data' => [['id', 'nama', 'hp', 'kota']]]);
        $this->assertGreaterThanOrEqual(1, count($res->json('data')));
    }

    public function test_list_searchable_by_nama(): void
    {
        Customer::create(['nama' => 'Budi Santoso', 'hp' => '0811111111']);

        $res = $this->actingAs($this->cs)->getJson('/api/crm/customer?q=Ahmad');

        $this->assertCount(1, $res->json('data'));
        $this->assertEquals('Ahmad Fauzi', $res->json('data.0.nama'));
    }

    public function test_list_searchable_by_hp(): void
    {
        $res = $this->actingAs($this->cs)->getJson('/api/crm/customer?q=081234567890');

        $this->assertCount(1, $res->json('data'));
    }

    public function test_list_filterable_by_kota(): void
    {
        Customer::create(['nama' => 'Other', 'hp' => '0899', 'kota' => 'Jakarta']);

        $res = $this->actingAs($this->cs)->getJson('/api/crm/customer?wilayah=Bandung');

        $this->assertCount(1, $res->json('data'));
        $this->assertEquals('Bandung', $res->json('data.0.kota'));
    }

    // ─── detail ──────────────────────────────────────────────────────────────

    public function test_cs_can_get_customer_detail(): void
    {
        $res = $this->actingAs($this->cs)
            ->getJson("/api/crm/customer/{$this->customer->id}");

        $res->assertOk()
            ->assertJsonStructure([
                'customer' => ['id', 'nama', 'hp'],
                'transaksi',
                'logs',
                'is_repeat',
            ]);
    }

    public function test_is_repeat_true_for_multi_musim_customer(): void
    {
        $this->makeTransaksi($this->musim - 1);
        $this->makeTransaksi($this->musim);

        $res = $this->actingAs($this->cs)
            ->getJson("/api/crm/customer/{$this->customer->id}");

        $this->assertTrue($res->json('is_repeat'));
    }

    public function test_is_repeat_false_for_single_musim(): void
    {
        $this->makeTransaksi($this->musim);

        $res = $this->actingAs($this->cs)
            ->getJson("/api/crm/customer/{$this->customer->id}");

        $this->assertFalse($res->json('is_repeat'));
    }

    // ─── update ──────────────────────────────────────────────────────────────

    public function test_cs_can_update_customer(): void
    {
        $res = $this->actingAs($this->cs)
            ->putJson("/api/crm/customer/{$this->customer->id}", [
                'nama' => 'Ahmad Updated',
                'hp'   => '081234567890',
                'kota' => 'Jakarta',
            ]);

        $res->assertOk()->assertJsonPath('customer.kota', 'Jakarta');
        $this->assertDatabaseHas('customers', ['id' => $this->customer->id, 'kota' => 'Jakarta']);
    }

    // ─── log interaksi ────────────────────────────────────────────────────────

    public function test_cs_can_add_log(): void
    {
        $res = $this->actingAs($this->cs)
            ->postJson("/api/crm/customer/{$this->customer->id}/log", [
                'tanggal' => today()->toDateString(),
                'channel' => 'WA',
                'isi'     => 'Customer tanya jadwal pemotongan',
            ]);

        $res->assertCreated()->assertJsonPath('log.channel', 'WA');
        $this->assertDatabaseHas('log_interaksi', ['customer_id' => $this->customer->id, 'channel' => 'WA']);
    }

    public function test_log_validates_required_fields(): void
    {
        $this->actingAs($this->cs)
            ->postJson("/api/crm/customer/{$this->customer->id}/log", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tanggal', 'channel', 'isi']);
    }

    public function test_log_rejects_invalid_channel(): void
    {
        $this->actingAs($this->cs)
            ->postJson("/api/crm/customer/{$this->customer->id}/log", [
                'tanggal' => today()->toDateString(),
                'channel' => 'SMS',
                'isi'     => 'Test',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['channel']);
    }

    // ─── retargeting ─────────────────────────────────────────────────────────

    public function test_retargeting_returns_prev_musim_customers_not_in_current(): void
    {
        $this->makeTransaksi($this->musim - 1); // bought last season only
        // no transaksi for current musim

        $other = Customer::create(['nama' => 'New Customer', 'hp' => '0822222222']);
        Transaksi::create([
            'depot_id' => $this->depot->id, 'no_faktur' => 'FAK-NEW',
            'customer_id' => $other->id, 'tipe_qurban' => 'SHQ',
            'jenis' => 'SAPI', 'kelas_id' => KelasHewan::first()->id,
            'harga' => 10_000_000, 'total' => 10_000_000,
            'status_transaksi' => 'SELESAI', 'musim' => $this->musim,
        ]);

        $res = $this->actingAs($this->cs)
            ->getJson("/api/crm/customer/retargeting?musim={$this->musim}");

        $res->assertOk()->assertJsonStructure(['data', 'musim', 'prev_musim']);

        $ids = collect($res->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($this->customer->id));
        $this->assertFalse($ids->contains($other->id));
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/crm/customer')->assertUnauthorized();
    }
}
