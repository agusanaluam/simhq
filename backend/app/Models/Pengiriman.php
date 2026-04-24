<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pengiriman extends Model
{

    protected $table = 'pengiriman';

    protected $fillable = [
        'depot_id', 'transaksi_id', 'nama_penerima', 'alamat', 'kelurahan',
        'kecamatan', 'kota', 'patokan', 'no_hp1', 'no_hp2',
        'tgl_kirim', 'sesi', 'status', 'petugas_id',
        'tgl_berangkat', 'tgl_sampai', 'catatan',
    ];

    protected $casts = [
        'tgl_kirim'     => 'date',
        'tgl_berangkat' => 'datetime',
        'tgl_sampai'    => 'datetime',
    ];

    public function depot(): BelongsTo    { return $this->belongsTo(Depot::class); }
    public function transaksi(): BelongsTo { return $this->belongsTo(Transaksi::class); }
    public function petugas(): BelongsTo  { return $this->belongsTo(User::class, 'petugas_id'); }
    public function distribusi(): HasMany { return $this->hasMany(DistribusiDaging::class); }
}
