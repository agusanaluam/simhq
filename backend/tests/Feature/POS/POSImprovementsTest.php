<?php
namespace Tests\Feature\POS;

use App\Models\Customer;
use App\Models\Depot;
use App\Models\KelasHewan;
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
}
