<?php
// backend/app/Models/JamKerjaDefault.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JamKerjaDefault extends Model
{
    protected $table = 'jam_kerja_default';
    protected $fillable = ['depot_id', 'divisi', 'jam_masuk', 'jam_keluar', 'toleransi_menit'];
    protected $casts = ['toleransi_menit' => 'integer'];

    public function depot(): BelongsTo { return $this->belongsTo(Depot::class); }
}
