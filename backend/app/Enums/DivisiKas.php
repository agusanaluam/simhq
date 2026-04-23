<?php

namespace App\Enums;

enum DivisiKas: string
{
    case KONSTRUKSI = 'KONSTRUKSI';
    case LOGISTIK   = 'LOGISTIK';
    case ADMIN      = 'ADMIN';
    case CS         = 'CS';
    case KANDANG    = 'KANDANG';
    case DISTRIBUSI = 'DISTRIBUSI';
    case PAKAN      = 'PAKAN';
    case LISTRIK    = 'LISTRIK';
    case LAIN       = 'LAIN';
}
