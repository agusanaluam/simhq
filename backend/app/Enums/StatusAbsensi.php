<?php
// backend/app/Enums/StatusAbsensi.php
namespace App\Enums;

enum StatusAbsensi: string
{
    case HADIR       = 'HADIR';
    case TERLAMBAT   = 'TERLAMBAT';
    case TIDAK_HADIR = 'TIDAK_HADIR';
}
