<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class FotoHewan extends Model
{

    protected $table = 'foto_hewan';

    protected $fillable = ['hewan_id', 'url', 'urutan', 'upload_by'];

    protected $casts = ['urutan' => 'integer'];

    protected $appends = ['foto_url'];

    public function hewan(): BelongsTo    { return $this->belongsTo(Hewan::class); }
    public function uploadBy(): BelongsTo { return $this->belongsTo(User::class, 'upload_by'); }

    public function getFotoUrlAttribute(): string
    {
        return Storage::disk('r2')->url($this->url);
    }
}
