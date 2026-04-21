<?php
namespace Tests\Feature\Master;

use App\Models\User;
use App\Models\Yayasan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class YayasanTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
    }

    public function test_list_yayasan(): void
    {
        Yayasan::create(['nama' => 'Yayasan Baitul Maal', 'is_active' => true]);

        $this->actingAs($this->superAdmin)
            ->getJson('/api/master/yayasan')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'nama']]]);
    }

    public function test_store_yayasan(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/master/yayasan', [
                'nama'       => 'Yayasan Al Ikhlas',
                'alamat'     => 'Jl. Kebon Jeruk No. 10',
                'kontak_pic' => 'Ustadz Ahmad',
                'telepon'    => '0812345678',
            ])
            ->assertCreated()
            ->assertJsonPath('yayasan.nama', 'Yayasan Al Ikhlas');
    }

    public function test_update_yayasan(): void
    {
        $y = Yayasan::create(['nama' => 'Lama', 'is_active' => true]);

        $this->actingAs($this->superAdmin)
            ->putJson("/api/master/yayasan/{$y->id}", ['nama' => 'Baru'])
            ->assertOk()
            ->assertJsonPath('yayasan.nama', 'Baru');
    }
}
