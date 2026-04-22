<?php
// backend/app/Services/AbsensiService.php
namespace App\Services;

use App\Enums\StatusAbsensi;
use App\Models\JamKerjaDefault;
use App\Models\Karyawan;

class AbsensiService
{
    public function getJamKerja(Karyawan $karyawan): ?JamKerjaDefault
    {
        return JamKerjaDefault::where('depot_id', $karyawan->depot_id)
            ->where('divisi', $karyawan->divisi)
            ->first();
    }

    public function hitungStatus(Karyawan $karyawan, string $jamMasuk): string
    {
        $jadwal = $this->getJamKerja($karyawan);
        if (! $jadwal) {
            return StatusAbsensi::HADIR->value;
        }

        $masuk = strtotime($jamMasuk);
        $batas = strtotime($jadwal->jam_masuk) + ($jadwal->toleransi_menit * 60);

        return $masuk > $batas
            ? StatusAbsensi::TERLAMBAT->value
            : StatusAbsensi::HADIR->value;
    }

    public function hitungDurasi(string $jamMasuk, string $jamKeluar): int
    {
        return (int) round((strtotime($jamKeluar) - strtotime($jamMasuk)) / 60);
    }
}
