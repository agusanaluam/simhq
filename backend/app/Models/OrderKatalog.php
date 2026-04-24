<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderKatalog extends Model
{
    protected $table = 'order_katalog';

    protected $fillable = [
        'depot_id', 'nama', 'hp', 'alamat',
        'jenis', 'kelas', 'tipe_qurban', 'catatan', 'status', 'cs_id',
    ];

    public function depot(): BelongsTo { return $this->belongsTo(Depot::class); }
    public function cs(): BelongsTo    { return $this->belongsTo(User::class, 'cs_id'); }
}
