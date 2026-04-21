<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Karyawan extends Model
{
    protected $fillable = [
        'user_id', 'depot_id', 'nama', 'divisi',
        'tarif_harian', 'berlaku_dari', 'is_active',
    ];

    protected $casts = [
        'tarif_harian' => 'integer',
        'berlaku_dari' => 'date',
        'is_active'    => 'boolean',
    ];

    public function depot(): BelongsTo { return $this->belongsTo(Depot::class); }
    public function user(): BelongsTo  { return $this->belongsTo(User::class); }
}
