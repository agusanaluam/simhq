<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RealisasiPengeluaran extends Model
{
    protected $table = 'realisasi_pengeluaran';

    protected $fillable = [
        'rab_id', 'keterangan', 'jumlah', 'tgl_pengeluaran', 'input_by',
    ];

    protected $casts = [
        'jumlah'          => 'integer',
        'tgl_pengeluaran' => 'date',
    ];

    public function rab(): BelongsTo     { return $this->belongsTo(Rab::class); }
    public function inputBy(): BelongsTo { return $this->belongsTo(User::class, 'input_by'); }
}
