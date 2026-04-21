<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiwayatPerpindahan extends Model
{
    protected $table = 'riwayat_perpindahan';

    protected $fillable = [
        'hewan_id', 'dari_petak_id', 'ke_petak_id',
        'user_id', 'tgl', 'catatan',
    ];

    protected $casts = ['tgl' => 'date'];

    public function hewan(): BelongsTo { return $this->belongsTo(Hewan::class); }
    public function user(): BelongsTo  { return $this->belongsTo(User::class); }
}
