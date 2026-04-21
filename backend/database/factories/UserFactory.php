<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\Depot;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'depot_id'  => Depot::factory(),
            'name'      => $this->faker->name(),
            'email'     => $this->faker->unique()->safeEmail(),
            'password'  => Hash::make('password'),
            'role'      => UserRole::ADMIN_ANGGOTA,
            'divisi'    => 'Admin',
            'phone'     => $this->faker->phoneNumber(),
            'is_active' => true,
        ];
    }

    public function superAdmin(): static
    {
        return $this->state(['role' => UserRole::SUPER_ADMIN, 'depot_id' => null]);
    }
}
