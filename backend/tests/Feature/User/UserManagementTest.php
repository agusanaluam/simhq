<?php

namespace Tests\Feature\User;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot = Depot::factory()->create();
        $this->superAdmin = User::factory()->superAdmin()->create();
    }

    public function test_super_admin_can_list_users(): void
    {
        User::factory()->count(3)->create(['depot_id' => $this->depot->id]);

        $this->actingAs($this->superAdmin)
            ->getJson('/api/users')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'email', 'role', 'depot_id']]]);
    }

    public function test_super_admin_can_create_user(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/users', [
                'depot_id' => $this->depot->id,
                'name'     => 'Budi Santoso',
                'email'    => 'budi@test.com',
                'password' => 'password123',
                'role'     => 'ADMIN_ANGGOTA',
                'divisi'   => 'Admin',
                'phone'    => '08123456789',
            ])
            ->assertCreated()
            ->assertJsonPath('user.email', 'budi@test.com');
    }

    public function test_super_admin_can_update_user_role(): void
    {
        $user = User::factory()->create(['depot_id' => $this->depot->id]);

        $this->actingAs($this->superAdmin)
            ->putJson("/api/users/{$user->id}", ['role' => 'CS_ANGGOTA'])
            ->assertOk()
            ->assertJsonPath('user.role', 'CS_ANGGOTA');
    }

    public function test_super_admin_can_deactivate_user(): void
    {
        $user = User::factory()->create(['depot_id' => $this->depot->id]);

        $this->actingAs($this->superAdmin)
            ->deleteJson("/api/users/{$user->id}")
            ->assertOk();

        $this->assertSoftDeleted('users', ['id' => $user->id]);
    }

    public function test_non_super_admin_cannot_access_users(): void
    {
        $regular = User::factory()->create(['depot_id' => $this->depot->id]);

        $this->actingAs($regular)
            ->getJson('/api/users')
            ->assertForbidden();
    }
}
