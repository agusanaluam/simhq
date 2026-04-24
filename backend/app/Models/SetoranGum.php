<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SetoranGum extends Model
{
    protected $table = 'setoran_gum';

    protected $fillable = [
        'depot_id', 'supplier_id', 'tgl_setor',
        'jumlah', 'metode', 'keterangan', 'input_by',
    ];

    protected $casts = [
        'tgl_setor' => 'date',
        'jumlah'    => 'integer',
    ];

    public function depot(): BelongsTo    { return $this->belongsTo(Depot::class); }
    public function supplier(): BelongsTo { return $this->belongsTo(Supplier::class); }
    public function inputBy(): BelongsTo  { return $this->belongsTo(User::class, 'input_by'); }
}
