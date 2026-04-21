<?php
namespace Database\Seeders;

use App\Models\KelasHewan;
use Illuminate\Database\Seeder;

class KelasHewanSeeder extends Seeder
{
    public function run(): void
    {
        $kelas = [
            ['kode' => 'D',    'nama' => 'Domba',    'urutan' => 1],
            ['kode' => 'C',    'nama' => 'Cukup',    'urutan' => 2],
            ['kode' => 'B',    'nama' => 'Bagus',    'urutan' => 3],
            ['kode' => 'A',    'nama' => 'A',        'urutan' => 4],
            ['kode' => 'SPR1', 'nama' => 'Super 1',  'urutan' => 5],
            ['kode' => 'SPR2', 'nama' => 'Super 2',  'urutan' => 6],
            ['kode' => 'SPR3', 'nama' => 'Super 3',  'urutan' => 7],
            ['kode' => 'IST',  'nama' => 'Istimewa', 'urutan' => 8],
        ];

        foreach ($kelas as $k) {
            KelasHewan::firstOrCreate(['kode' => $k['kode']], $k);
        }
    }
}
