<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KematianHewan extends Model
{

    protected $table = 'kematian_hewan';

    protected $fillable = ['hewan_id', 'tgl', 'penyebab', 'status_daging', 'petugas_id'];

    protected $casts = ['tgl' => 'date'];

    public function hewan(): BelongsTo   { return $this->belongsTo(Hewan::class); }
    public function petugas(): BelongsTo { return $this->belongsTo(User::class, 'petugas_id'); }
}
