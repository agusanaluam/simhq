<?php
// backend/app/Models/BiayaTambahan.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BiayaTambahan extends Model
{
    protected $table = 'biaya_tambahan';

    protected $fillable = ['transaksi_id', 'keterangan', 'jumlah'];

    protected $casts = ['jumlah' => 'integer'];

    public function transaksi(): BelongsTo { return $this->belongsTo(Transaksi::class); }
}
