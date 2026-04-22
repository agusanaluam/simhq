<?php
// backend/app/Enums/StatusBayar.php
namespace App\Enums;

enum StatusBayar: string
{
    case BELUM_BAYAR = 'BELUM_BAYAR';
    case DP          = 'DP';
    case LUNAS       = 'LUNAS';
}
