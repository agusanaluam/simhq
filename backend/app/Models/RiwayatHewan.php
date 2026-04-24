<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiwayatHewan extends Model
{

    protected $table = 'riwayat_hewan';

    protected $fillable = [
        'hewan_id', 'tgl', 'kondisi', 'bobot', 'catatan',
        'tindakan_medis', 'obat', 'petugas_id',
    ];

    protected $casts = [
        'tgl'   => 'date',
        'bobot' => 'decimal:2',
    ];

    public function hewan(): BelongsTo   { return $this->belongsTo(Hewan::class); }
    public function petugas(): BelongsTo { return $this->belongsTo(User::class, 'petugas_id'); }
}
