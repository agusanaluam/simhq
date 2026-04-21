<?php
namespace App\Enums;

enum StatusHewan: string
{
    case AVAILABLE = 'AVAILABLE';
    case BOOKED    = 'BOOKED';
    case SOLD      = 'SOLD';
    case DELIVERED = 'DELIVERED';
    case MATI      = 'MATI';
}
