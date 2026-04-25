<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RabKategori extends Model
{
    use HasFactory;

    protected $table = 'rab_kategori';
    protected $fillable = ['nama', 'is_active'];
    protected $casts = ['is_active' => 'boolean'];

    public function rabs(): HasMany { return $this->hasMany(Rab::class, 'kategori_id'); }
}
