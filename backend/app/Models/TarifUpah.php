<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TarifUpah extends Model
{

    protected $table = 'tarif_upah';

    protected $fillable = ['karyawan_id', 'tarif_harian', 'berlaku_dari', 'dibuat_oleh'];

    protected $casts = [
        'tarif_harian' => 'integer',
        'berlaku_dari' => 'date',
    ];

    public function karyawan(): BelongsTo   { return $this->belongsTo(Karyawan::class); }
    public function dibuatOleh(): BelongsTo { return $this->belongsTo(User::class, 'dibuat_oleh'); }
}
