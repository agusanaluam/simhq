<?php
namespace Tests\Feature\POS;

use App\Models\Customer;
use App\Models\Depot;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\SlotSapi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SlotSapiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Depot $depot;
    private KelasHewan $kelas;
    private Hewan $sapi;
    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin    = User::factory()->superAdmin()->create();
        $this->depot    = Depot::factory()->create();
        $this->kelas    = KelasHewan::create(['kode' => 'A1', 'nama' => 'Kelas A1', 'urutan' => 1]);
        $this->customer = Customer::create(['nama' => 'Budi', 'hp' => '08111']);

        $this->sapi = Hewan::create([
            'depot_id'     => $this->depot->id,
            'kelas_asal_id'=> $this->kelas->id,
            'kelas_jual_id'=> $this->kelas->id,
            'no_hewan'     => '001',
            'jenis'        => 'SAPI',
            'bobot_masuk'  => 300,
            'tgl_masuk'    => '2026-04-01',
            'musim'        => 2026,
            'status'       => 'BOOKED',
        ]);
    }

    private function slotPayload(array $overrides = []): array
    {
        return array_merge([
            'no_slot'     => 1,
            'customer_id' => $this->customer->id,
            'nama_qurban' => 'Ahmad bin Budi',
            'tipe_qurban' => 'SHQ',
            'harga_slot'  => 900000,
            'status_bayar'=> 'DP',
        ], $overrides);
    }

    public function test_list_slots_returns_7_entries(): void
    {
        SlotSapi::create(array_merge($this->slotPayload(), ['hewan_id' => $this->sapi->id]));

        $res = $this->actingAs($this->admin)
            ->getJson("/api/hewan/{$this->sapi->id}/slot");

        $res->assertOk();
        $this->assertCount(7, $res->json('slots'));
    }

    public function test_store_slot_sets_hewan_booked(): void
    {
        $this->sapi->update(['status' => 'AVAILABLE']);

        $this->actingAs($this->admin)
            ->postJson("/api/hewan/{$this->sapi->id}/slot", $this->slotPayload())
            ->assertCreated()
            ->assertJsonPath('slot.no_slot', 1);

        $this->assertDatabaseHas('hewan', ['id' => $this->sapi->id, 'status' => 'BOOKED']);
    }

    public function test_store_all_7_slots_sets_hewan_sold(): void
    {
        foreach (range(1, 7) as $n) {
            $this->actingAs($this->admin)
                ->postJson("/api/hewan/{$this->sapi->id}/slot", $this->slotPayload(['no_slot' => $n]))
                ->assertCreated();
        }

        $this->assertDatabaseHas('hewan', ['id' => $this->sapi->id, 'status' => 'SOLD']);
    }

    public function test_store_duplicate_slot_returns_422(): void
    {
        SlotSapi::create(array_merge($this->slotPayload(), ['hewan_id' => $this->sapi->id]));

        $this->actingAs($this->admin)
            ->postJson("/api/hewan/{$this->sapi->id}/slot", $this->slotPayload())
            ->assertUnprocessable();
    }

    public function test_update_slot(): void
    {
        SlotSapi::create(array_merge($this->slotPayload(), ['hewan_id' => $this->sapi->id]));

        $this->actingAs($this->admin)
            ->putJson("/api/hewan/{$this->sapi->id}/slot/1", [
                'nama_qurban' => 'Siti binti Budi',
                'status_bayar'=> 'LUNAS',
            ])
            ->assertOk()
            ->assertJsonPath('slot.nama_qurban', 'Siti binti Budi')
            ->assertJsonPath('slot.status_bayar', 'LUNAS');
    }

    public function test_destroy_last_slot_sets_hewan_available(): void
    {
        SlotSapi::create(array_merge($this->slotPayload(), ['hewan_id' => $this->sapi->id]));
        $this->sapi->update(['status' => 'BOOKED']);

        $this->actingAs($this->admin)
            ->deleteJson("/api/hewan/{$this->sapi->id}/slot/1")
            ->assertOk();

        $this->assertDatabaseHas('hewan', ['id' => $this->sapi->id, 'status' => 'AVAILABLE']);
        $this->assertDatabaseMissing('slot_sapi', ['hewan_id' => $this->sapi->id, 'no_slot' => 1]);
    }

    public function test_destroy_partial_slot_stays_booked(): void
    {
        foreach ([1, 2] as $n) {
            SlotSapi::create(array_merge($this->slotPayload(['no_slot' => $n]), ['hewan_id' => $this->sapi->id]));
        }
        $this->sapi->update(['status' => 'BOOKED']);

        $this->actingAs($this->admin)
            ->deleteJson("/api/hewan/{$this->sapi->id}/slot/1")
            ->assertOk();

        $this->assertDatabaseHas('hewan', ['id' => $this->sapi->id, 'status' => 'BOOKED']);
    }

    public function test_ploting_dashboard(): void
    {
        SlotSapi::create(array_merge($this->slotPayload(), ['hewan_id' => $this->sapi->id]));

        $this->actingAs($this->admin)
            ->getJson("/api/hewan/sapi/ploting?depot={$this->depot->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'no_hewan', 'slot_terisi', 'slot_total']]]);
    }
}
