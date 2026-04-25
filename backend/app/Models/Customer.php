<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{

    protected $table = 'customers';

    protected $fillable = ['nama', 'hp', 'alamat', 'kelurahan', 'kecamatan', 'kota', 'kode_pos'];

    public function transaksi(): HasMany { return $this->hasMany(Transaksi::class); }
    public function logs(): HasMany      { return $this->hasMany(LogInteraksi::class); }
}

