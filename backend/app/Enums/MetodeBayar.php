<?php
// backend/app/Enums/MetodeBayar.php
namespace App\Enums;

enum MetodeBayar: string
{
    case CASH          = 'CASH';
    case TRANSFER_BCA  = 'TRANSFER_BCA';
    case TRANSFER_LAIN = 'TRANSFER_LAIN';
}
