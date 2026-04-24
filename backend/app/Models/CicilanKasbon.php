<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CicilanKasbon extends Model
{

    protected $table = 'cicilan_kasbon';

    protected $fillable = [
        'kasbon_id', 'nominal_cicilan', 'jumlah_cicil', 'cicil_terbayar', 'tgl_mulai',
    ];

    protected $casts = [
        'nominal_cicilan' => 'integer',
        'jumlah_cicil'    => 'integer',
        'cicil_terbayar'  => 'integer',
        'tgl_mulai'       => 'date',
    ];

    public function kasbon(): BelongsTo { return $this->belongsTo(Kasbon::class); }
}
