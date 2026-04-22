<?php
// backend/app/Models/Absensi.php
namespace App\Models;

use App\Enums\StatusAbsensi;
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
        'tgl'    => 'date',
        'durasi' => 'integer',
        'status' => StatusAbsensi::class,
    ];

    public function karyawan(): BelongsTo   { return $this->belongsTo(Karyawan::class); }
    public function overrideBy(): BelongsTo { return $this->belongsTo(User::class, 'override_by'); }
}
