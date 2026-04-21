<?php
namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        Supplier::firstOrCreate(
            ['nama' => 'GUM'],
            ['kontak' => '', 'alamat' => 'Supplier Utama GUM', 'is_gum' => true, 'is_active' => true]
        );
    }
}
