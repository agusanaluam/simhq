<?php

namespace Database\Factories;

use App\Models\Depot;
use App\Models\RabKategori;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class RabFactory extends Factory
{
    public function definition(): array
    {
        return [
            'depot_id'         => Depot::factory(),
            'kategori_id'      => RabKategori::factory(),
            'musim'            => $this->faker->numberBetween(2024, 2026),
            'jumlah_anggaran'  => $this->faker->numberBetween(1_000_000, 50_000_000),
            'created_by'       => User::factory(),
        ];
    }
}
