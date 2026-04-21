<?php

namespace App\Enums;

enum UserRole: string
{
    case SUPER_ADMIN           = 'SUPER_ADMIN';
    case KEPALA_DEPOT          = 'KEPALA_DEPOT';
    case ADMIN_KETUA           = 'ADMIN_KETUA';
    case ADMIN_ANGGOTA         = 'ADMIN_ANGGOTA';
    case KANDANG_SAPI_KETUA    = 'KANDANG_SAPI_KETUA';
    case KANDANG_SAPI_ANGGOTA  = 'KANDANG_SAPI_ANGGOTA';
    case KANDANG_DOMBA_KETUA   = 'KANDANG_DOMBA_KETUA';
    case KANDANG_DOMBA_ANGGOTA = 'KANDANG_DOMBA_ANGGOTA';
    case CS_KETUA              = 'CS_KETUA';
    case CS_ANGGOTA            = 'CS_ANGGOTA';
    case LOGISTIK_KETUA        = 'LOGISTIK_KETUA';
    case LOGISTIK_ANGGOTA      = 'LOGISTIK_ANGGOTA';
    case PAKAN_KETUA           = 'PAKAN_KETUA';
    case PAKAN_ANGGOTA         = 'PAKAN_ANGGOTA';
    case KONSTRUKSI_KETUA      = 'KONSTRUKSI_KETUA';
    case KONSTRUKSI_ANGGOTA    = 'KONSTRUKSI_ANGGOTA';

    public function isAdmin(): bool
    {
        return in_array($this, [self::SUPER_ADMIN, self::KEPALA_DEPOT, self::ADMIN_KETUA]);
    }

    public function isSuperAdmin(): bool
    {
        return $this === self::SUPER_ADMIN;
    }
}
