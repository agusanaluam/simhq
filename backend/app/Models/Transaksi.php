<?php
namespace App\Models;

use App\Enums\StatusTransaksi;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaksi extends Model
{
    protected $table = 'transaksi';

    protected $fillable = [
        'depot_id', 'no_faktur', 'hewan_id', 'customer_id',
        'cs_id', 'teller_id', 'sales_id', 'yayasan_id',
        'tipe_qurban', 'jenis', 'kelas_id',
        'harga', 'total', 'status_transaksi', 'musim', 'catatan',
    ];

    protected $attributes = [
        'status_transaksi' => 'MENUNGGU_HEWAN',
    ];

    protected $casts = [
        'status_transaksi' => StatusTransaksi::class,
        'harga'            => 'integer',
        'total'            => 'integer',
        'musim'            => 'integer',
    ];

    public function depot(): BelongsTo    { return $this->belongsTo(Depot::class); }
    public function hewan(): BelongsTo    { return $this->belongsTo(Hewan::class); }
    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function kelas(): BelongsTo    { return $this->belongsTo(KelasHewan::class, 'kelas_id'); }
    public function cs(): BelongsTo       { return $this->belongsTo(User::class, 'cs_id'); }
    public function teller(): BelongsTo   { return $this->belongsTo(User::class, 'teller_id'); }
    public function sales(): BelongsTo    { return $this->belongsTo(User::class, 'sales_id'); }
    public function yayasan(): BelongsTo  { return $this->belongsTo(Yayasan::class); }
}
