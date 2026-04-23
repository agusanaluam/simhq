<?php

namespace Database\Factories;

use App\Enums\TipeKas;
use App\Models\Depot;
use Illuminate\Database\Eloquent\Factories\Factory;

class KasHarianFactory extends Factory
{
    public function definition(): array
    {
        $tipe = $this->faker->randomElement(['MASUK', 'KELUAR']);
        return [
            'depot_id'      => Depot::factory(),
            'tipe'          => $tipe,
            'sumber'        => $tipe === 'MASUK' ? $this->faker->randomElement(['PENJUALAN', 'DEPOSIT', 'LAIN']) : null,
            'divisi'        => $tipe === 'KELUAR' ? $this->faker->randomElement(['ADMIN', 'LOGISTIK', 'KANDANG']) : null,
            'keterangan'    => $this->faker->sentence(4),
            'jumlah'        => $this->faker->numberBetween(100_000, 5_000_000),
            'metode'        => $this->faker->randomElement(['CASH', 'TRANSFER_BCA']),
            'tgl_transaksi' => $this->faker->dateTimeBetween('-30 days', 'now')->format('Y-m-d'),
            'input_by'      => null,
            'transaksi_id'  => null,
        ];
    }

    public function masuk(): static
    {
        return $this->state(['tipe' => TipeKas::MASUK, 'sumber' => 'DEPOSIT', 'divisi' => null]);
    }

    public function keluar(): static
    {
        return $this->state(['tipe' => TipeKas::KELUAR, 'sumber' => null, 'divisi' => 'ADMIN']);
    }
}
