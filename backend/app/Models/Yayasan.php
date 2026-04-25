<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Yayasan extends Model
{
    protected $table = 'yayasan';
    protected $fillable = ['nama', 'alamat', 'kontak_pic', 'telepon', 'is_active'];
    protected $casts = ['is_active' => 'boolean'];

    public function transaksi(): HasMany
    {
        return $this->hasMany(Transaksi::class);
    }
}
