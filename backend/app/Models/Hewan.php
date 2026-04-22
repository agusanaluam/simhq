<?php
namespace App\Models;

use App\Enums\StatusHewan;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Hewan extends Model
{
    protected $table = 'hewan';

    protected $fillable = [
        'depot_id', 'supplier_id', 'kelas_asal_id', 'kelas_jual_id',
        'no_hewan', 'jenis', 'bobot_masuk', 'bobot_terkini',
        'tgl_masuk', 'musim', 'status', 'petak_id',
    ];

    protected $attributes = [
        'status' => 'AVAILABLE',
    ];

    protected $casts = [
        'status'        => StatusHewan::class,
        'tgl_masuk'     => 'date',
        'bobot_masuk'   => 'decimal:2',
        'bobot_terkini' => 'decimal:2',
        'musim'         => 'integer',
    ];

    public function depot(): BelongsTo     { return $this->belongsTo(Depot::class); }
    public function supplier(): BelongsTo  { return $this->belongsTo(Supplier::class); }
    public function kelasAsal(): BelongsTo { return $this->belongsTo(KelasHewan::class, 'kelas_asal_id'); }
    public function kelasJual(): BelongsTo { return $this->belongsTo(KelasHewan::class, 'kelas_jual_id'); }
    public function petak(): BelongsTo           { return $this->belongsTo(PetakKandang::class, 'petak_id'); }
    public function riwayatPerpindahan(): HasMany { return $this->hasMany(RiwayatPerpindahan::class); }
    public function slotSapi(): HasMany { return $this->hasMany(SlotSapi::class); }

    public function qrString(): string
    {
        return "{$this->depot_id}-{$this->musim}-{$this->no_hewan}";
    }
}
