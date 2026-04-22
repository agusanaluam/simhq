<?php

namespace App\Models;

use App\Enums\StatusBayarSlot;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SlotSapi extends Model
{
    protected $table = 'slot_sapi';

    protected $fillable = [
        'hewan_id', 'no_slot', 'transaksi_id', 'customer_id',
        'nama_qurban', 'tipe_qurban', 'harga_slot', 'status_bayar',
    ];

    protected $casts = [
        'no_slot'     => 'integer',
        'harga_slot'  => 'integer',
        'status_bayar'=> StatusBayarSlot::class,
    ];

    public function hewan(): BelongsTo     { return $this->belongsTo(Hewan::class); }
    public function customer(): BelongsTo  { return $this->belongsTo(Customer::class); }
    public function transaksi(): BelongsTo { return $this->belongsTo(Transaksi::class); }
}
