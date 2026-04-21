<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $table = 'supplier';
    protected $fillable = ['nama', 'kontak', 'alamat', 'is_gum', 'is_active'];
    protected $casts = ['is_gum' => 'boolean', 'is_active' => 'boolean'];

    public function hewan(): HasMany { return $this->hasMany(Hewan::class); }
}
