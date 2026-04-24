<?php

namespace Tests\Feature\Katalog;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\OrderKatalog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CsOrderTest extends TestCase
{
    use RefreshDatabase;

    private User  $cs;
    private Depot $depot;
    private int   $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot = Depot::factory()->create();
        $this->cs    = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::CS_KETUA,
        ]);
    }

    private function makeOrder(array $attrs = []): OrderKatalog
    {
        $this->seq++;
        return OrderKatalog::create(array_merge([
            'depot_id'    => $this->depot->id,
            'nama'        => "Pembeli {$this->seq}",
            'hp'          => '08123456789' . $this->seq,
            'jenis'       => 'SAPI',
            'kelas'       => 'Kelas A',
            'tipe_qurban' => 'SHQ',
            'status'      => 'BARU',
        ], $attrs));
    }

    // ─── index ───────────────────────────────────────────────────────────────

    public function test_cs_can_list_orders(): void
    {
        $this->makeOrder();
        $this->makeOrder();

        $res = $this->actingAs($this->cs)->getJson('/api/cs/order');

        $res->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'data' => [['id', 'nama', 'hp', 'jenis', 'kelas', 'tipe_qurban', 'status']],
                    'total', 'per_page', 'current_page',
                ],
            ]);
        $this->assertCount(2, $res->json('data.data'));
    }

    public function test_orders_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        $this->makeOrder();
        OrderKatalog::create([
            'depot_id' => $otherDepot->id, 'nama' => 'Other',
            'hp' => '081111', 'jenis' => 'SAPI', 'kelas' => 'A',
            'tipe_qurban' => 'SHQ', 'status' => 'BARU',
        ]);

        $res = $this->actingAs($this->cs)->getJson('/api/cs/order');

        $this->assertCount(1, $res->json('data.data'));
    }

    public function test_orders_filterable_by_status(): void
    {
        $this->makeOrder(['status' => 'BARU']);
        $this->makeOrder(['status' => 'DIKONFIRMASI']);

        $res = $this->actingAs($this->cs)->getJson('/api/cs/order?status=BARU');

        $this->assertCount(1, $res->json('data.data'));
        $this->assertEquals('BARU', $res->json('data.data.0.status'));
    }

    // ─── update status ────────────────────────────────────────────────────────

    public function test_cs_can_update_order_status(): void
    {
        $order = $this->makeOrder(['status' => 'BARU']);

        $res = $this->actingAs($this->cs)
            ->putJson("/api/cs/order/{$order->id}/status", ['status' => 'DIKONFIRMASI']);

        $res->assertOk()->assertJsonPath('order.status', 'DIKONFIRMASI');
        $this->assertDatabaseHas('order_katalog', ['id' => $order->id, 'status' => 'DIKONFIRMASI']);
    }

    public function test_cannot_update_status_of_other_depots_order(): void
    {
        $otherDepot = Depot::factory()->create();
        $otherOrder = OrderKatalog::create([
            'depot_id' => $otherDepot->id, 'nama' => 'Other',
            'hp' => '081111', 'jenis' => 'SAPI', 'kelas' => 'A',
            'tipe_qurban' => 'SHQ', 'status' => 'BARU',
        ]);

        $this->actingAs($this->cs)
            ->putJson("/api/cs/order/{$otherOrder->id}/status", ['status' => 'DIKONFIRMASI'])
            ->assertForbidden();
    }

    public function test_update_status_validates_valid_values(): void
    {
        $order = $this->makeOrder();

        $this->actingAs($this->cs)
            ->putJson("/api/cs/order/{$order->id}/status", ['status' => 'INVALID'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_cs_endpoints(): void
    {
        $this->getJson('/api/cs/order')->assertUnauthorized();
    }
}
