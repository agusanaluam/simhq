<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $depot = Depot::firstOrCreate(
            ['nama' => 'Depot Utama'],
            ['alamat' => 'Jl. Contoh No. 1', 'kota' => 'Jakarta', 'is_active' => true]
        );

        User::firstOrCreate(
            ['email' => 'superadmin@simhq.id'],
            [
                'name'      => 'Super Admin',
                'password'  => Hash::make('Admin@12345'),
                'role'      => UserRole::SUPER_ADMIN,
                'is_active' => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'kepala@simhq.id'],
            [
                'depot_id'  => $depot->id,
                'name'      => 'Kepala Depot Utama',
                'password'  => Hash::make('Kepala@12345'),
                'role'      => UserRole::KEPALA_DEPOT,
                'is_active' => true,
            ]
        );
    }
}
