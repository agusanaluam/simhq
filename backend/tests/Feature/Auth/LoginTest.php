<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $depot = Depot::factory()->create();
        $this->user = User::factory()->create([
            'depot_id'  => $depot->id,
            'email'     => 'admin@test.com',
            'password'  => bcrypt('password123'),
            'role'      => UserRole::ADMIN_KETUA,
            'is_active' => true,
        ]);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email'    => 'admin@test.com',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email', 'role', 'depot_id'],
            ]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $this->postJson('/api/auth/login', [
            'email'    => 'admin@test.com',
            'password' => 'wrong',
        ])->assertUnprocessable()
          ->assertJsonValidationErrors(['email']);
    }

    public function test_login_fails_for_inactive_user(): void
    {
        $this->user->update(['is_active' => false]);

        $this->postJson('/api/auth/login', [
            'email'    => 'admin@test.com',
            'password' => 'password123',
        ])->assertUnprocessable()
          ->assertJsonValidationErrors(['email']);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $token = $this->user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'admin@test.com');
    }

    public function test_logout_revokes_token(): void
    {
        $token = $this->user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/auth/logout')
            ->assertOk();

        // Flush the auth guard cache so the next request re-validates from DB
        auth()->guard('sanctum')->forgetUser();

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
    }
}
