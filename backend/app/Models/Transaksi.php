<?php
namespace App\Models;

use App\Enums\StatusBayar;
use App\Enums\StatusTransaksi;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaksi extends Model
{
    protected $table = 'transaksi';

    protected $fillable = [
        'depot_id', 'no_faktur', 'hewan_id', 'customer_id',
        'cs_id', 'teller_id', 'sales_id', 'sales_nama', 'rencana_pelunasan', 'yayasan_id',
        'tipe_qurban', 'jenis', 'kelas_id',
        'harga', 'total', 'ongkos_kirim', 'biaya_potong',
        'status_bayar', 'status_transaksi', 'musim', 'catatan',
    ];

    protected $attributes = [
        'status_transaksi' => 'MENUNGGU_HEWAN',
        'status_bayar'     => 'BELUM_BAYAR',
    ];

    protected $casts = [
        'status_transaksi'  => StatusTransaksi::class,
        'status_bayar'      => StatusBayar::class,
        'harga'             => 'integer',
        'total'             => 'integer',
        'ongkos_kirim'      => 'integer',
        'biaya_potong'      => 'integer',
        'musim'             => 'integer',
        'rencana_pelunasan' => 'date',
    ];

    public function depot(): BelongsTo    { return $this->belongsTo(Depot::class); }
    public function hewan(): BelongsTo    { return $this->belongsTo(Hewan::class); }
    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function kelas(): BelongsTo    { return $this->belongsTo(KelasHewan::class, 'kelas_id'); }
    public function cs(): BelongsTo       { return $this->belongsTo(User::class, 'cs_id'); }
    public function teller(): BelongsTo   { return $this->belongsTo(User::class, 'teller_id'); }
    public function sales(): BelongsTo    { return $this->belongsTo(User::class, 'sales_id'); }
    public function yayasan(): BelongsTo  { return $this->belongsTo(Yayasan::class); }

    public function pembayaran(): HasMany    { return $this->hasMany(Pembayaran::class, 'transaksi_id'); }
    public function biayaTambahan(): HasMany { return $this->hasMany(BiayaTambahan::class, 'transaksi_id'); }
    public function items(): HasMany         { return $this->hasMany(TransaksiItem::class); }
}
