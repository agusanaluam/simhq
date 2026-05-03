<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransaksiItem extends Model
{
    protected $table = 'transaksi_items';

    protected $fillable = [
        'transaksi_id', 'hewan_id', 'jenis', 'kelas_id',
        'tipe_qurban', 'harga', 'is_preorder', 'satuan', 'nama_qurban', 'tgl_pengiriman',
    ];

    protected $casts = [
        'is_preorder' => 'boolean',
        'harga'       => 'integer',
    ];

    public function transaksi(): BelongsTo { return $this->belongsTo(Transaksi::class); }
    public function hewan(): BelongsTo    { return $this->belongsTo(Hewan::class); }
    public function kelas(): BelongsTo    { return $this->belongsTo(KelasHewan::class, 'kelas_id'); }
}
