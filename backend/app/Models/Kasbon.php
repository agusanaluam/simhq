<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Kasbon extends Model
{

    protected $table = 'kasbon';

    protected $fillable = [
        'karyawan_id', 'depot_id', 'nominal', 'alasan',
        'status', 'approved_by', 'tgl_approve',
    ];

    protected $casts = [
        'nominal'     => 'integer',
        'tgl_approve' => 'date',
    ];

    public function karyawan(): BelongsTo   { return $this->belongsTo(Karyawan::class); }
    public function depot(): BelongsTo      { return $this->belongsTo(Depot::class); }
    public function approvedBy(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
    public function cicilan(): HasOne       { return $this->hasOne(CicilanKasbon::class); }
}
