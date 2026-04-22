<?php
namespace App\Enums;

enum StatusTransaksi: string
{
    case MENUNGGU_HEWAN    = 'MENUNGGU_HEWAN';
    case HEWAN_TERALOKASI  = 'HEWAN_TERALOKASI';
    case DIKONFIRMASI      = 'DIKONFIRMASI';
    case SELESAI           = 'SELESAI';
    case DIBATALKAN        = 'DIBATALKAN';
}
