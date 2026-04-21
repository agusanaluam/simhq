<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'depot_id', 'name', 'email', 'password',
        'role', 'divisi', 'phone', 'is_active',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
        'role'              => UserRole::class,
        'is_active'         => 'boolean',
    ];

    public function depot(): BelongsTo
    {
        return $this->belongsTo(Depot::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === UserRole::SUPER_ADMIN;
    }

    public function scopeForDepot($query, ?int $depotId): void
    {
        if ($depotId !== null) {
            $query->where('depot_id', $depotId);
        }
    }
}
