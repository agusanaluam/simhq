<?php
// backend/app/Models/Pembayaran.php
namespace App\Models;

use App\Enums\MetodeBayar;
use App\Enums\TipeBayar;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pembayaran extends Model
{
    protected $table = 'pembayaran';

    protected $fillable = [
        'transaksi_id', 'jumlah', 'tipe', 'metode',
        'teller_id', 'tgl_bayar', 'catatan',
    ];

    protected $casts = [
        'jumlah'   => 'integer',
        'tipe'     => TipeBayar::class,
        'metode'   => MetodeBayar::class,
        'tgl_bayar'=> 'date',
    ];

    public function transaksi(): BelongsTo { return $this->belongsTo(Transaksi::class); }
    public function teller(): BelongsTo    { return $this->belongsTo(User::class, 'teller_id'); }
}
