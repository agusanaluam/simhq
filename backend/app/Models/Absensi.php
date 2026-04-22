<?php
// backend/app/Models/Absensi.php
namespace App\Models;

use App\Enums\StatusAbsensi;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Absensi extends Model
{
    protected $table = 'absensi';

    protected $fillable = [
        'karyawan_id', 'tgl', 'jam_masuk', 'jam_keluar',
        'durasi', 'status', 'override_by', 'catatan',
    ];

    protected $casts = [
        'tgl'    => 'date:Y-m-d',
        'durasi' => 'integer',
        'status' => StatusAbsensi::class,
    ];

    /** Force tgl to be stored as Y-m-d (SQLite stores Carbon as datetime otherwise). */
    public function setTglAttribute(mixed $value): void
    {
        $this->attributes['tgl'] = $value instanceof Carbon
            ? $value->format('Y-m-d')
            : Carbon::parse($value)->format('Y-m-d');
    }

    public function karyawan(): BelongsTo   { return $this->belongsTo(Karyawan::class); }
    public function overrideBy(): BelongsTo { return $this->belongsTo(User::class, 'override_by'); }
}
