<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HargaKelas extends Model
{
    protected $table = 'harga_kelas';
    protected $fillable = [
        'depot_id', 'kelas_id', 'jenis', 'musim',
        'harga_beli', 'harga_jual', 'fee_sales',
    ];

    protected $casts = [
        'harga_beli' => 'integer',
        'harga_jual' => 'integer',
        'fee_sales'  => 'integer',
        'musim'      => 'integer',
    ];

    public function depot(): BelongsTo { return $this->belongsTo(Depot::class); }
    public function kelas(): BelongsTo { return $this->belongsTo(KelasHewan::class, 'kelas_id'); }
}
