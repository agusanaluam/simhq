<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rab extends Model
{
    protected $table = 'rab';

    protected $fillable = [
        'depot_id', 'kategori_id', 'musim', 'jumlah_anggaran', 'created_by',
    ];

    protected $casts = [
        'jumlah_anggaran' => 'integer',
        'musim'           => 'integer',
    ];

    public function depot(): BelongsTo     { return $this->belongsTo(Depot::class); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function realisasi(): HasMany   { return $this->hasMany(RealisasiPengeluaran::class); }
    public function kategori(): BelongsTo  { return $this->belongsTo(RabKategori::class, 'kategori_id'); }
}
