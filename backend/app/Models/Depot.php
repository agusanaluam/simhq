<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Depot extends Model
{
    use HasFactory;

    protected $fillable = ['nama', 'slug', 'alamat', 'kota', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $depot) {
            if (empty($depot->slug)) {
                $base = Str::slug($depot->nama ?? 'depot');
                $slug = $base;
                $i    = 2;
                while (static::where('slug', $slug)->exists()) {
                    $slug = "{$base}-{$i}";
                    $i++;
                }
                $depot->slug = $slug;
            }
        });
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
