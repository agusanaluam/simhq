<?php

namespace App\Models;

use App\Enums\TipeKas;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KasHarian extends Model
{
    protected $table = 'kas_harian';

    protected $fillable = [
        'depot_id', 'tipe', 'sumber', 'divisi', 'keterangan',
        'jumlah', 'metode', 'tgl_transaksi', 'input_by', 'transaksi_id', 'rab_id',
    ];

    protected $casts = [
        'tipe'          => TipeKas::class,
        'jumlah'        => 'integer',
        'tgl_transaksi' => 'date',
    ];

    public function depot(): BelongsTo     { return $this->belongsTo(Depot::class); }
    public function inputBy(): BelongsTo   { return $this->belongsTo(User::class, 'input_by'); }
    public function transaksi(): BelongsTo { return $this->belongsTo(Transaksi::class); }
    public function rab(): BelongsTo       { return $this->belongsTo(Rab::class); }
}
