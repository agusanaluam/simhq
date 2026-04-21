<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PetakKandang extends Model
{
    protected $table = 'petak_kandang';

    protected $fillable = [
        'depot_id', 'no_petak', 'jenis_kandang', 'kapasitas',
        'kelas_id', 'posisi_x', 'posisi_y', 'is_active',
    ];

    protected $casts = [
        'kapasitas' => 'integer',
        'posisi_x'  => 'integer',
        'posisi_y'  => 'integer',
        'is_active' => 'boolean',
    ];

    public function depot(): BelongsTo { return $this->belongsTo(Depot::class); }
    public function kelas(): BelongsTo { return $this->belongsTo(KelasHewan::class, 'kelas_id'); }
    public function hewan(): HasMany   { return $this->hasMany(Hewan::class, 'petak_id'); }

    public function jumlahTerisi(): int
    {
        return $this->hewan()->whereNotIn('status', ['MATI', 'DELIVERED'])->count();
    }
}
