<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DistribusiDaging extends Model
{

    protected $table = 'distribusi_daging';

    protected $fillable = [
        'pengiriman_id', 'nama_penerima', 'alamat', 'no_hp',
        'qty_daging', 'qty_tulang', 'qty_jeroan', 'status',
    ];

    public function pengiriman(): BelongsTo { return $this->belongsTo(Pengiriman::class); }
}
