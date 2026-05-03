<?php
namespace Tests\Feature\POS;

use App\Models\Customer;
use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\SlotSapi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class POSImprovementsTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;
    private KelasHewan $kelas;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->depot      = Depot::factory()->create();
        $this->kelas      = KelasHewan::create(['kode' => 'A', 'nama' => 'A', 'urutan' => 4]);
    }

    public function test_users_index_filters_by_role(): void
    {
        $cs    = User::factory()->create(['role' => 'CS_KETUA',      'name' => 'CS User']);
        $admin = User::factory()->create(['role' => 'ADMIN_ANGGOTA', 'name' => 'Admin User']);

        $res = $this->actingAs($this->superAdmin)
            ->getJson('/api/users?role=CS_KETUA,CS_ANGGOTA')
            ->assertOk();

        $ids = collect($res->json('data'))->pluck('id')->toArray();
        $this->assertContains($cs->id, $ids);
        $this->assertNotContains($admin->id, $ids);
    }

    public function test_customer_store_accepts_kode_pos(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/customer', [
                'nama'      => 'Budi',
                'hp'        => '081234567890',
                'kode_pos'  => '12345',
            ])
            ->assertCreated()
            ->assertJsonPath('customer.kode_pos', '12345');
    }

    public function test_transaksi_store_accepts_sales_nama_and_rencana_pelunasan(): void
    {
        $customer = Customer::create(['nama' => 'Test', 'hp' => '081234567890']);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/transaksi', [
                'depot_id'           => $this->depot->id,
                'customer_id'        => $customer->id,
                'musim'              => 2026,
                'sales_nama'         => 'Andi Sales',
                'rencana_pelunasan'  => '2026-06-01',
                'items'              => [
                    [
                        'jenis'       => 'SAPI',
                        'kelas_id'    => $this->kelas->id,
                        'tipe_qurban' => 'SHQ',
                        'harga'       => 1_000_000,
                        'is_preorder' => true,
                        'hewan_id'    => null,
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('transaksi.sales_nama', 'Andi Sales');
    }

    public function test_biaya_tambahan_masuk_ke_total(): void
    {
        $customer = Customer::create(['nama' => 'Test', 'hp' => '081234567890']);

        $res = $this->actingAs($this->superAdmin)
            ->postJson('/api/transaksi', [
                'depot_id'     => $this->depot->id,
                'customer_id'  => $customer->id,
                'musim'        => 2026,
                'ongkos_kirim' => 50_000,
                'biaya_potong' => 100_000,
                'items'        => [
                    [
                        'jenis'       => 'SAPI',
                        'kelas_id'    => $this->kelas->id,
                        'tipe_qurban' => 'PHQ',
                        'harga'       => 6_000_000,
                        'is_preorder' => true,
                        'hewan_id'    => null,
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('transaksi.total', 6_150_000);

        $this->assertDatabaseHas('transaksi', [
            'ongkos_kirim' => 50_000,
            'biaya_potong' => 100_000,
            'total'        => 6_150_000,
        ]);
    }

    public function test_pos_slot_auto_create_slot_sapi(): void
    {
        $customer = Customer::create(['nama' => 'Siti', 'hp' => '08222']);
        $hewan    = \App\Models\Hewan::create([
            'depot_id'      => $this->depot->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'no_hewan'      => 'S01',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300,
            'tgl_masuk'     => '2026-04-01',
            'musim'         => 2026,
            'status'        => 'AVAILABLE',
        ]);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/transaksi', [
                'depot_id'    => $this->depot->id,
                'customer_id' => $customer->id,
                'musim'       => 2026,
                'items'       => [[
                    'jenis'       => 'SAPI',
                    'kelas_id'    => $this->kelas->id,
                    'tipe_qurban' => 'PHQ',
                    'harga'       => 900_000,
                    'is_preorder' => false,
                    'hewan_id'    => $hewan->id,
                    'satuan'      => 'SLOT',
                    'nama_qurban' => 'Ahmad bin Budi',
                ]],
            ])
            ->assertCreated();

        $this->assertDatabaseHas('slot_sapi', [
            'hewan_id'    => $hewan->id,
            'no_slot'     => 1,
            'customer_id' => $customer->id,
            'tipe_qurban' => 'PHQ',
            'harga_slot'  => 900_000,
            'nama_qurban' => 'Ahmad bin Budi',
            'status_bayar'=> 'DP',
        ]);
    }

    public function test_pos_slot_auto_assigns_next_available_slot(): void
    {
        $customer = Customer::create(['nama' => 'Siti', 'hp' => '08222']);
        $hewan    = \App\Models\Hewan::create([
            'depot_id'      => $this->depot->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'no_hewan'      => 'S02',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300,
            'tgl_masuk'     => '2026-04-01',
            'musim'         => 2026,
            'status'        => 'AVAILABLE',
        ]);

        // Pre-fill slots 1 and 2
        SlotSapi::insert([
            ['hewan_id' => $hewan->id, 'no_slot' => 1, 'customer_id' => $customer->id, 'nama_qurban' => 'A', 'tipe_qurban' => 'SHQ', 'harga_slot' => 900000, 'status_bayar' => 'DP', 'created_at' => now(), 'updated_at' => now()],
            ['hewan_id' => $hewan->id, 'no_slot' => 2, 'customer_id' => $customer->id, 'nama_qurban' => 'B', 'tipe_qurban' => 'SHQ', 'harga_slot' => 900000, 'status_bayar' => 'DP', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/transaksi', [
                'depot_id'    => $this->depot->id,
                'customer_id' => $customer->id,
                'musim'       => 2026,
                'items'       => [[
                    'jenis'       => 'SAPI',
                    'kelas_id'    => $this->kelas->id,
                    'tipe_qurban' => 'SHQ',
                    'harga'       => 900_000,
                    'is_preorder' => false,
                    'hewan_id'    => $hewan->id,
                    'satuan'      => 'SLOT',
                    'nama_qurban' => null,
                ]],
            ])
            ->assertCreated();

        $this->assertDatabaseHas('slot_sapi', [
            'hewan_id' => $hewan->id,
            'no_slot'  => 3,
        ]);
    }

    public function test_pos_slot_penuh_returns_422(): void
    {
        $customer = Customer::create(['nama' => 'Siti', 'hp' => '08222']);
        $hewan    = \App\Models\Hewan::create([
            'depot_id'      => $this->depot->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'no_hewan'      => 'S03',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300,
            'tgl_masuk'     => '2026-04-01',
            'musim'         => 2026,
            'status'        => 'AVAILABLE',
        ]);

        $rows = [];
        for ($i = 1; $i <= 7; $i++) {
            $rows[] = ['hewan_id' => $hewan->id, 'no_slot' => $i, 'customer_id' => $customer->id, 'nama_qurban' => 'X', 'tipe_qurban' => 'SHQ', 'harga_slot' => 900000, 'status_bayar' => 'DP', 'created_at' => now(), 'updated_at' => now()];
        }
        SlotSapi::insert($rows);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/transaksi', [
                'depot_id'    => $this->depot->id,
                'customer_id' => $customer->id,
                'musim'       => 2026,
                'items'       => [[
                    'jenis'       => 'SAPI',
                    'kelas_id'    => $this->kelas->id,
                    'tipe_qurban' => 'SHQ',
                    'harga'       => 900_000,
                    'is_preorder' => false,
                    'hewan_id'    => $hewan->id,
                    'satuan'      => 'SLOT',
                    'nama_qurban' => null,
                ]],
            ])
            ->assertUnprocessable();
    }

    public function test_pos_ekor_tidak_buat_slot_sapi(): void
    {
        $customer = Customer::create(['nama' => 'Siti', 'hp' => '08222']);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/transaksi', [
                'depot_id'    => $this->depot->id,
                'customer_id' => $customer->id,
                'musim'       => 2026,
                'items'       => [[
                    'jenis'       => 'SAPI',
                    'kelas_id'    => $this->kelas->id,
                    'tipe_qurban' => 'SHQ',
                    'harga'       => 6_000_000,
                    'is_preorder' => true,
                    'hewan_id'    => null,
                    'satuan'      => 'EKOR',
                    'nama_qurban' => null,
                ]],
            ])
            ->assertCreated();

        $this->assertDatabaseCount('slot_sapi', 0);
    }
}
