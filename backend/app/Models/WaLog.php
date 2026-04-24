<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WaLog extends Model
{

    protected $table = 'wa_log';

    protected $fillable = [
        'depot_id', 'penerima', 'pesan', 'status', 'error_message', 'triggered_by',
    ];

    public function depot(): BelongsTo
    {
        return $this->belongsTo(Depot::class);
    }
}
