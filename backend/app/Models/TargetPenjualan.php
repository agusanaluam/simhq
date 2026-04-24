<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TargetPenjualan extends Model
{

    protected $table = 'target_penjualan';

    protected $fillable = ['depot_id', 'musim', 'jenis', 'tgl', 'target_unit', 'created_by'];

    protected $casts = [
        'tgl'         => 'date:Y-m-d',
        'musim'       => 'integer',
        'target_unit' => 'integer',
    ];

    /** Force tgl to be stored as Y-m-d string (SQLite stores Carbon as datetime otherwise). */
    public function setTglAttribute(mixed $value): void
    {
        $this->attributes['tgl'] = $value instanceof Carbon
            ? $value->format('Y-m-d')
            : Carbon::parse($value)->format('Y-m-d');
    }

    public function depot(): BelongsTo     { return $this->belongsTo(Depot::class); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
}
