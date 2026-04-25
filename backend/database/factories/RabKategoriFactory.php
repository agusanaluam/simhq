<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class RabKategoriFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nama'      => $this->faker->randomElement(['KANDANG', 'LOGISTIK', 'ADMIN', 'KESEHATAN']),
            'is_active' => true,
        ];
    }
}
