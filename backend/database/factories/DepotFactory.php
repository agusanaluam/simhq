<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class DepotFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nama'      => $this->faker->company() . ' Depot',
            'alamat'    => $this->faker->address(),
            'kota'      => $this->faker->city(),
            'is_active' => true,
        ];
    }
}
