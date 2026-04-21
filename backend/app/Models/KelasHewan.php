<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KelasHewan extends Model
{
    protected $table = 'kelas_hewan';
    protected $fillable = ['kode', 'nama', 'urutan'];

    public function hargaKelas(): HasMany
    {
        return $this->hasMany(HargaKelas::class, 'kelas_id');
    }
}
