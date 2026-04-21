<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Yayasan extends Model
{
    protected $fillable = ['nama', 'alamat', 'kontak_pic', 'telepon', 'is_active'];
    protected $casts = ['is_active' => 'boolean'];
}
