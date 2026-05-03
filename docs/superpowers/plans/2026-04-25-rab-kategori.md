# RAB Kategori Custom + Kas KELUAR Wajib RAB

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti divisi enum tetap di RAB dengan kategori custom yang bisa dikelola. Kas KELUAR wajib pilih pos RAB.

**Architecture:** Tabel baru `rab_kategori`. `rab.divisi` → `rab.kategori_id` FK. RAB summary menghitung realisasi dari dua sumber: `realisasi_pengeluaran` (via RAB page) + `kas_harian KELUAR where rab_id` (via BIOP). `storeRealisasi` tidak set `rab_id` di KasHarian-nya agar tidak double-count.

**Tech Stack:** Laravel 11 (PHP), Next.js 14 (TypeScript), Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `backend/database/migrations/2026_04_25_create_rab_kategori_table.php` | Baru |
| `backend/database/migrations/2026_04_25_migrate_rab_divisi_to_kategori.php` | Baru |
| `backend/app/Models/RabKategori.php` | Baru |
| `backend/app/Http/Controllers/RabKategoriController.php` | Baru |
| `backend/app/Models/Rab.php` | divisi → kategori_id, tambah kategori() relation |
| `backend/app/Http/Controllers/RabController.php` | summary, store, storeRealisasi |
| `backend/app/Http/Controllers/KasController.php` | rab_id required KELUAR, auto-set divisi |
| `backend/routes/api.php` | routes rab-kategori |
| `frontend/app/(dashboard)/keuangan/rab/page.tsx` | fetch kategori, update interface, tambah RAB + kategori buttons |
| `frontend/app/(dashboard)/keuangan/rab/components/RabSummaryTable.tsx` | DivisiRow → RabRow |
| `frontend/app/(dashboard)/keuangan/rab/components/SetRabModal.tsx` | kategori_id instead of divisi, support create + edit |
| `frontend/app/(dashboard)/keuangan/components/TambahKasModal.tsx` | mandatory RAB dropdown for KELUAR |

---

## Task 1: Backend — RabKategori table + model + controller + routes

**Files:**
- Create: `backend/database/migrations/2026_04_25_create_rab_kategori_table.php`
- Create: `backend/app/Models/RabKategori.php`
- Create: `backend/app/Http/Controllers/RabKategoriController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create rab_kategori migration**

Create `backend/database/migrations/2026_04_25_create_rab_kategori_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rab_kategori', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 100)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rab_kategori');
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd C:/Users/USER/projects/simhq/backend && php artisan migrate
```

Expected: `Migrated: 2026_04_25_create_rab_kategori_table`

- [ ] **Step 3: Create RabKategori model**

Create `backend/app/Models/RabKategori.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RabKategori extends Model
{
    protected $table = 'rab_kategori';
    protected $fillable = ['nama', 'is_active'];
    protected $casts = ['is_active' => 'boolean'];

    public function rabs(): HasMany { return $this->hasMany(Rab::class, 'kategori_id'); }
}
```

- [ ] **Step 4: Create RabKategoriController**

Create `backend/app/Http/Controllers/RabKategoriController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Rab;
use App\Models\RabKategori;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RabKategoriController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => RabKategori::where('is_active', true)->orderBy('nama')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:100', 'unique:rab_kategori,nama'],
        ]);
        $kategori = RabKategori::create(array_merge($data, ['is_active' => true]));
        return response()->json(['kategori' => $kategori], 201);
    }

    public function update(Request $request, RabKategori $rabKategori): JsonResponse
    {
        $data = $request->validate([
            'nama'      => ['sometimes', 'string', 'max:100', 'unique:rab_kategori,nama,' . $rabKategori->id],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $rabKategori->update($data);
        return response()->json(['kategori' => $rabKategori->fresh()]);
    }

    public function destroy(RabKategori $rabKategori): JsonResponse
    {
        if (Rab::where('kategori_id', $rabKategori->id)->exists()) {
            return response()->json(['message' => 'Kategori sudah digunakan di RAB, tidak dapat dihapus.'], 422);
        }
        $rabKategori->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 5: Add routes to api.php**

In `backend/routes/api.php`, find the master data prefix block. Add inside `Route::prefix('master')` after the existing middleware group:

```php
        Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT')->group(function () {
            Route::get('rab-kategori',                        [\App\Http\Controllers\RabKategoriController::class, 'index']);
            Route::post('rab-kategori',                       [\App\Http\Controllers\RabKategoriController::class, 'store']);
            Route::put('rab-kategori/{rabKategori}',          [\App\Http\Controllers\RabKategoriController::class, 'update']);
            Route::delete('rab-kategori/{rabKategori}',       [\App\Http\Controllers\RabKategoriController::class, 'destroy']);
        });
```

- [ ] **Step 6: Verify routes**

```bash
cd C:/Users/USER/projects/simhq/backend && php artisan route:list --path=rab-kategori
```

Expected: GET, POST, PUT, DELETE for `api/master/rab-kategori`.

- [ ] **Step 7: Run tests**

```bash
cd C:/Users/USER/projects/simhq/backend && php artisan test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
cd C:/Users/USER/projects/simhq && git add backend/database/migrations/2026_04_25_create_rab_kategori_table.php backend/app/Models/RabKategori.php backend/app/Http/Controllers/RabKategoriController.php backend/routes/api.php
git commit -m "feat(rab): add rab_kategori table + model + controller + routes"
```

---

## Task 2: Backend — Migrate rab.divisi → kategori_id + Rab model + RabController

**Files:**
- Create: `backend/database/migrations/2026_04_25_migrate_rab_divisi_to_kategori.php`
- Modify: `backend/app/Models/Rab.php`
- Modify: `backend/app/Http/Controllers/RabController.php`

- [ ] **Step 1: Create migration**

Create `backend/database/migrations/2026_04_25_migrate_rab_divisi_to_kategori.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Seed rab_kategori from distinct divisi values in existing rab rows
        $divisiValues = DB::table('rab')->distinct()->pluck('divisi')->filter()->values();
        $now = now();
        foreach ($divisiValues as $divisi) {
            DB::table('rab_kategori')->insertOrIgnore([
                'nama'       => $divisi,
                'is_active'  => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // 2. Add nullable kategori_id column with FK
        Schema::table('rab', function (Blueprint $table) {
            $table->unsignedBigInteger('kategori_id')->nullable()->after('depot_id');
            $table->foreign('kategori_id')->references('id')->on('rab_kategori')->cascadeOnDelete();
        });

        // 3. Populate kategori_id from matching rab_kategori.nama = rab.divisi
        $kategoris = DB::table('rab_kategori')->pluck('id', 'nama');
        foreach ($kategoris as $nama => $id) {
            DB::table('rab')->where('divisi', $nama)->update(['kategori_id' => $id]);
        }

        // 4. Drop old unique index and divisi column, add new unique
        Schema::table('rab', function (Blueprint $table) {
            try {
                $table->dropUnique('rab_depot_id_divisi_musim_unique');
            } catch (\Exception $e) {
                // Index name may vary; ignore if not found
            }
            $table->dropColumn('divisi');
        });

        Schema::table('rab', function (Blueprint $table) {
            $table->unique(['depot_id', 'kategori_id', 'musim']);
        });
    }

    public function down(): void
    {
        Schema::table('rab', function (Blueprint $table) {
            try { $table->dropUnique(['depot_id', 'kategori_id', 'musim']); } catch (\Exception $e) {}
            $table->string('divisi', 30)->nullable()->after('depot_id');
        });

        Schema::table('rab', function (Blueprint $table) {
            $table->dropForeign(['kategori_id']);
            $table->dropColumn('kategori_id');
        });
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd C:/Users/USER/projects/simhq/backend && php artisan migrate
```

Expected: `Migrated: 2026_04_25_migrate_rab_divisi_to_kategori`

- [ ] **Step 3: Update Rab model**

Replace entire `backend/app/Models/Rab.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rab extends Model
{
    protected $table = 'rab';

    protected $fillable = [
        'depot_id', 'kategori_id', 'musim', 'jumlah_anggaran', 'created_by',
    ];

    protected $casts = [
        'jumlah_anggaran' => 'integer',
        'musim'           => 'integer',
    ];

    public function depot(): BelongsTo     { return $this->belongsTo(Depot::class); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function realisasi(): HasMany   { return $this->hasMany(RealisasiPengeluaran::class); }
    public function kategori(): BelongsTo  { return $this->belongsTo(RabKategori::class, 'kategori_id'); }
}
```

- [ ] **Step 4: Update RabController**

Replace entire `backend/app/Http/Controllers/RabController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\KasHarian;
use App\Models\Rab;
use App\Models\RealisasiPengeluaran;
use App\Models\User;
use App\Services\WahaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RabController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;
        $musim   = (int) $request->input('musim', date('Y'));

        $rabs = Rab::where('depot_id', $depotId)
            ->where('musim', $musim)
            ->with('kategori:id,nama')
            ->withSum('realisasi', 'jumlah')
            ->get();

        // Kas KELUAR with rab_id (from BIOP) — counted separately to avoid double-count
        $rabIds = $rabs->pluck('id');
        $kasHarianSums = KasHarian::whereIn('rab_id', $rabIds)
            ->where('tipe', 'KELUAR')
            ->groupBy('rab_id')
            ->selectRaw('rab_id, SUM(jumlah) as total')
            ->pluck('total', 'rab_id');

        $result = $rabs->map(function (Rab $rab) use ($kasHarianSums): array {
            $anggaran       = $rab->jumlah_anggaran;
            $fromRealisasi  = (int) ($rab->realisasi_sum_jumlah ?? 0);
            $fromKasHarian  = (int) ($kasHarianSums->get($rab->id, 0));
            $totalRealisasi = $fromRealisasi + $fromKasHarian;
            $selisih        = $anggaran - $totalRealisasi;
            $persen         = $anggaran > 0 ? round($totalRealisasi / $anggaran * 100, 1) : 0.0;

            return [
                'rab_id'          => $rab->id,
                'kategori_id'     => $rab->kategori_id,
                'kategori'        => $rab->kategori?->nama ?? '—',
                'jumlah_anggaran' => $anggaran,
                'total_realisasi' => $totalRealisasi,
                'selisih'         => $selisih,
                'persen_terpakai' => $persen,
            ];
        })->values();

        return response()->json(['musim' => $musim, 'data' => $result]);
    }

    public function store(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin()
            ? ($request->depot_id ?? $user->depot_id)
            : $user->depot_id;

        $data = $request->validate([
            'kategori_id'     => ['required', 'exists:rab_kategori,id'],
            'musim'           => ['required', 'integer', 'min:2020', 'max:2099'],
            'jumlah_anggaran' => ['required', 'integer', 'min:0'],
        ]);

        $rab = Rab::updateOrCreate(
            ['depot_id' => $depotId, 'kategori_id' => $data['kategori_id'], 'musim' => $data['musim']],
            ['jumlah_anggaran' => $data['jumlah_anggaran']]
        );

        if ($rab->wasRecentlyCreated) {
            $rab->update(['created_by' => $user->id]);
        }

        $status = $rab->wasRecentlyCreated ? 201 : 200;

        return response()->json(['rab' => $rab->load('kategori:id,nama')], $status);
    }

    public function indexRealisasi(Request $request, Rab $rab): JsonResponse
    {
        $depotId = $request->user()->isSuperAdmin()
            ? ($request->depot_id ?? $request->user()->depot_id)
            : $request->user()->depot_id;

        abort_unless($rab->depot_id === (int) $depotId, 403);

        $items = $rab->realisasi()
            ->with('inputBy:id,name')
            ->orderBy('tgl_pengeluaran', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json(['data' => $items, 'rab' => $rab->load('kategori:id,nama')]);
    }

    public function storeRealisasi(Request $request, Rab $rab): JsonResponse
    {
        $depotId = $request->user()->isSuperAdmin()
            ? ($request->depot_id ?? $request->user()->depot_id)
            : $request->user()->depot_id;

        abort_unless($rab->depot_id === (int) $depotId, 403);

        $data = $request->validate([
            'keterangan'      => ['required', 'string', 'max:300'],
            'jumlah'          => ['required', 'integer', 'min:1'],
            'tgl_pengeluaran' => ['required', 'date'],
        ]);

        $user          = $request->user();
        $kategoriNama  = $rab->kategori?->nama ?? 'RAB';

        $realisasi = DB::transaction(function () use ($rab, $data, $user, $kategoriNama): RealisasiPengeluaran {
            $realisasi = RealisasiPengeluaran::create(array_merge($data, [
                'rab_id'   => $rab->id,
                'input_by' => $user->id,
            ]));

            // KasHarian WITHOUT rab_id — counted via realisasi_pengeluaran in summary
            KasHarian::create([
                'depot_id'      => $rab->depot_id,
                'tipe'          => 'KELUAR',
                'sumber'        => null,
                'divisi'        => $kategoriNama,
                'keterangan'    => "RAB {$kategoriNama}: {$data['keterangan']}",
                'jumlah'        => $data['jumlah'],
                'metode'        => 'CASH',
                'tgl_transaksi' => $data['tgl_pengeluaran'],
                'input_by'      => $user->id,
                'transaksi_id'  => null,
                'rab_id'        => null,
            ]);

            return $realisasi;
        });

        // Alert Kepala Depot if RAB >= 80%
        $fromRealisasi = $rab->realisasi()->sum('jumlah');
        $fromKas       = KasHarian::where('rab_id', $rab->id)->where('tipe', 'KELUAR')->sum('jumlah');
        $totalRealisasi = $fromRealisasi + $fromKas;

        if ($rab->jumlah_anggaran > 0) {
            $persen = $totalRealisasi / $rab->jumlah_anggaran * 100;
            if ($persen >= 80) {
                $sisa      = number_format($rab->jumlah_anggaran - $totalRealisasi, 0, ',', '.');
                $persenFmt = round($persen, 1);
                User::where('depot_id', $rab->depot_id)
                    ->where('role', UserRole::KEPALA_DEPOT)
                    ->whereNotNull('phone')
                    ->each(function ($kd) use ($rab, $kategoriNama, $sisa, $persenFmt): void {
                        WahaService::send(
                            $rab->depot_id,
                            $kd->phone,
                            "WARNING: RAB {$kategoriNama} tersisa Rp{$sisa} (realisasi {$persenFmt}% dari anggaran).",
                            'rab_hampir_habis'
                        );
                    });
            }
        }

        return response()->json(['realisasi' => $realisasi->load('inputBy:id,name')], 201);
    }
}
```

- [ ] **Step 5: Run tests**

```bash
cd C:/Users/USER/projects/simhq/backend && php artisan test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/USER/projects/simhq && git add backend/database/migrations/2026_04_25_migrate_rab_divisi_to_kategori.php backend/app/Models/Rab.php backend/app/Http/Controllers/RabController.php
git commit -m "feat(rab): migrate divisi→kategori_id, update Rab model + RabController"
```

---

## Task 3: Backend — KasController rab_id required KELUAR

**Files:**
- Modify: `backend/app/Http/Controllers/KasController.php`

- [ ] **Step 1: Update store() validation**

Read `backend/app/Http/Controllers/KasController.php` first.

In `store()`, replace the `$data = $request->validate([...])` block:

```php
        $data = $request->validate([
            'tipe'          => ['required', 'in:MASUK,KELUAR'],
            'sumber'        => [\Illuminate\Validation\Rule::requiredIf($request->tipe === 'MASUK'), 'nullable', \Illuminate\Validation\Rule::in(array_column(SumberKas::cases(), 'value'))],
            'keterangan'    => ['required', 'string', 'max:300'],
            'jumlah'        => ['required', 'integer', 'min:1'],
            'metode'        => ['required', 'in:CASH,TRANSFER_BCA,TRANSFER_LAIN'],
            'tgl_transaksi' => ['required', 'date'],
            'rab_id'        => [\Illuminate\Validation\Rule::requiredIf($request->tipe === 'KELUAR'), 'nullable', 'exists:rab,id'],
        ]);
```

Note: `divisi` field removed from validation (auto-set from RAB).

- [ ] **Step 2: Add rab auto-set logic after validate**

After the `$data = $request->validate([...])` block, add before `$kas = KasHarian::create(...)`:

```php
        if (($data['tipe'] ?? '') === 'KELUAR' && ! empty($data['rab_id'])) {
            $rab = \App\Models\Rab::with('kategori:id,nama')
                ->where('id', $data['rab_id'])
                ->where('depot_id', $depotId)
                ->firstOrFail();
            $data['divisi'] = $rab->kategori?->nama ?? '';
        }
```

- [ ] **Step 3: Run tests**

```bash
cd C:/Users/USER/projects/simhq/backend && php artisan test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/USER/projects/simhq && git add backend/app/Http/Controllers/KasController.php
git commit -m "feat(biop): rab_id required for KELUAR, auto-set divisi from rab.kategori"
```

---

## Task 4: Frontend — RAB page refactor

**Files:**
- Modify: `frontend/app/(dashboard)/keuangan/rab/page.tsx`
- Modify: `frontend/app/(dashboard)/keuangan/rab/components/RabSummaryTable.tsx`
- Modify: `frontend/app/(dashboard)/keuangan/rab/components/SetRabModal.tsx`

- [ ] **Step 1: Replace RabSummaryTable.tsx**

Read `frontend/app/(dashboard)/keuangan/rab/components/RabSummaryTable.tsx` first.

Replace entire file:

```tsx
import { Card } from '@/components/ui/Card'
import { Settings, Plus } from 'lucide-react'

export interface RabRow {
  rab_id: number
  kategori_id: number
  kategori: string
  jumlah_anggaran: number
  total_realisasi: number
  selisih: number
  persen_terpakai: number
}

interface RabSummaryTableProps {
  rows: RabRow[]
  onSetRab: (row: RabRow) => void
  onAddRealisasi: (row: RabRow) => void
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

function progressColor(persen: number): string {
  if (persen >= 80) return 'bg-error'
  if (persen >= 70) return 'bg-[#ca8a04]'
  return 'bg-[#15803d]'
}

function textColor(persen: number): string {
  if (persen >= 80) return 'text-error'
  if (persen >= 70) return 'text-[#ca8a04]'
  return 'text-[#15803d]'
}

export function RabSummaryTable({ rows, onSetRab, onAddRealisasi }: RabSummaryTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant text-center py-8">
          Belum ada pos RAB untuk musim ini. Tambah RAB dulu.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-high">
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Kategori</th>
              <th className="text-right py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Anggaran</th>
              <th className="text-right py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Realisasi</th>
              <th className="text-right py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Selisih</th>
              <th className="py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest min-w-[140px]">% Terpakai</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rab_id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                <td className="py-3 px-4 font-body font-medium text-on-surface">{row.kategori}</td>
                <td className="py-3 px-4 font-display text-right text-on-surface whitespace-nowrap">
                  {rupiah(row.jumlah_anggaran)}
                </td>
                <td className="py-3 px-4 font-display text-right text-on-surface whitespace-nowrap">
                  {rupiah(row.total_realisasi)}
                </td>
                <td className={`py-3 px-4 font-display font-semibold text-right whitespace-nowrap ${textColor(row.persen_terpakai)}`}>
                  {rupiah(row.selisih)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-surface-high rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${progressColor(row.persen_terpakai)}`}
                        style={{ width: `${Math.min(row.persen_terpakai, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-body font-medium whitespace-nowrap ${textColor(row.persen_terpakai)}`}>
                      {row.persen_terpakai}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => onSetRab(row)}
                      className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-high transition-colors"
                      title="Edit Anggaran"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onAddRealisasi(row)}
                      className="p-1.5 rounded-md text-primary hover:bg-surface-high transition-colors"
                      title="Tambah Realisasi"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Replace SetRabModal.tsx**

Read `frontend/app/(dashboard)/keuangan/rab/components/SetRabModal.tsx` first.

Replace entire file — supports both create (kategori dropdown) and edit (kategori fixed):

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

interface Kategori { id: number; nama: string }

interface SetRabModalProps {
  // If kategoriId provided: edit mode. If null: create mode.
  kategoriId:      number | null
  kategoriNama:    string
  musim:           number
  currentAnggaran: number
  onDone:          () => void
  onClose:         () => void
}

export function SetRabModal({ kategoriId, kategoriNama, musim, currentAnggaran, onDone, onClose }: SetRabModalProps) {
  const isEdit = kategoriId !== null
  const [kategoris, setKategoris]   = useState<Kategori[]>([])
  const [selectedId, setSelectedId] = useState<string>(isEdit ? String(kategoriId) : '')
  const [jumlah, setJumlah]         = useState(currentAnggaran > 0 ? String(currentAnggaran) : '')
  const [saving, setSaving]         = useState(false)
  const [error,  setError]          = useState('')

  useEffect(() => {
    if (!isEdit) {
      api.get('/api/master/rab-kategori').then(r => setKategoris(r.data.data ?? []))
    }
  }, [isEdit])

  async function submit() {
    if (!isEdit && !selectedId) { setError('Pilih kategori terlebih dahulu.'); return }
    if (!jumlah) { setError('Jumlah anggaran wajib diisi.'); return }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/keuangan/rab', {
        kategori_id:     isEdit ? kategoriId : Number(selectedId),
        musim,
        jumlah_anggaran: Number(jumlah),
      })
      onDone()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-card w-full max-w-sm p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-on-surface">
          {isEdit ? `Edit RAB — ${kategoriNama}` : 'Tambah Pos RAB'}
        </h2>
        <p className="text-sm text-on-surface-variant">Musim {musim}</p>

        {!isEdit && (
          <div>
            <label className="block text-xs font-body font-medium text-on-surface-variant mb-1">Kategori *</label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="input-field w-full"
            >
              <option value="">— Pilih kategori —</option>
              {kategoris.map(k => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>
        )}

        <Input
          label="Jumlah Anggaran (Rp)"
          type="number"
          min="0"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          placeholder="10000000"
        />

        {error && (
          <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={submit} loading={saving} className="flex-1">Simpan</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace page.tsx**

Read `frontend/app/(dashboard)/keuangan/rab/page.tsx` first.

Replace entire file:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import { RabSummaryTable, type RabRow } from './components/RabSummaryTable'
import { SetRabModal }          from './components/SetRabModal'
import { TambahRealisasiModal } from './components/TambahRealisasiModal'
import api from '@/lib/api'

function TambahKategoriModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [nama, setNama]       = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  async function submit() {
    if (!nama.trim()) { setError('Nama kategori wajib diisi.'); return }
    setSaving(true); setError('')
    try {
      await api.post('/api/master/rab-kategori', { nama: nama.trim() })
      onDone()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Gagal menyimpan.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-card w-full max-w-sm p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-on-surface">Tambah Kategori RAB</h2>
        <Input
          label="Nama Kategori"
          value={nama}
          onChange={e => setNama(e.target.value)}
          placeholder="Pakan Sapi, Gaji Karyawan, dll..."
        />
        {error && <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={submit} loading={saving} className="flex-1">Simpan</Button>
        </div>
      </div>
    </div>
  )
}

export default function RabPage() {
  const currentYear = new Date().getFullYear()

  const [rows,    setRows]    = useState<RabRow[]>([])
  const [musim,   setMusim]   = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [editRabRow,     setEditRabRow]     = useState<RabRow | null>(null)
  const [tambahRab,      setTambahRab]      = useState(false)
  const [realisasiRow,   setRealisasiRow]   = useState<RabRow | null>(null)
  const [tambahKategori, setTambahKategori] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/keuangan/rab/summary?musim=${musim}`)
      setRows(res.data.data ?? [])
    } catch {
      setError('Gagal memuat data RAB.')
    } finally {
      setLoading(false)
    }
  }, [musim])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">RAB & Realisasi</h1>
          <p className="text-sm text-on-surface-variant mt-1">Anggaran per kategori vs realisasi pengeluaran</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Musim</label>
          <input
            type="number"
            min="2020"
            max="2099"
            value={musim}
            onChange={(e) => setMusim(Number(e.target.value))}
            className="input-field text-sm w-24"
          />
          <Button variant="secondary" onClick={() => setTambahKategori(true)}>+ Kategori</Button>
          <Button onClick={() => setTambahRab(true)}>+ Pos RAB</Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <RabSummaryTable
          rows={rows}
          onSetRab={(row) => setEditRabRow(row)}
          onAddRealisasi={(row) => setRealisasiRow(row)}
        />
      )}

      {/* Tambah Kategori */}
      {tambahKategori && (
        <TambahKategoriModal
          onDone={() => { setTambahKategori(false) }}
          onClose={() => setTambahKategori(false)}
        />
      )}

      {/* Tambah Pos RAB baru */}
      {tambahRab && (
        <SetRabModal
          kategoriId={null}
          kategoriNama=""
          musim={musim}
          currentAnggaran={0}
          onDone={() => { setTambahRab(false); fetchData() }}
          onClose={() => setTambahRab(false)}
        />
      )}

      {/* Edit anggaran RAB */}
      {editRabRow && (
        <SetRabModal
          kategoriId={editRabRow.kategori_id}
          kategoriNama={editRabRow.kategori}
          musim={musim}
          currentAnggaran={editRabRow.jumlah_anggaran}
          onDone={() => { setEditRabRow(null); fetchData() }}
          onClose={() => setEditRabRow(null)}
        />
      )}

      {/* Tambah Realisasi */}
      {realisasiRow && (
        <TambahRealisasiModal
          rabId={realisasiRow.rab_id}
          divisi={realisasiRow.kategori}
          onDone={() => { setRealisasiRow(null); fetchData() }}
          onClose={() => setRealisasiRow(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd C:/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | grep -i "error\|rab" | head -20
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/USER/projects/simhq && git add "frontend/app/(dashboard)/keuangan/rab/page.tsx" "frontend/app/(dashboard)/keuangan/rab/components/RabSummaryTable.tsx" "frontend/app/(dashboard)/keuangan/rab/components/SetRabModal.tsx"
git commit -m "feat(rab): refactor RAB page — custom kategori + tambah pos RAB + tambah kategori"
```

---

## Task 5: Frontend — TambahKasModal mandatory RAB dropdown

**Files:**
- Modify: `frontend/app/(dashboard)/keuangan/components/TambahKasModal.tsx`

- [ ] **Step 1: Replace TambahKasModal.tsx**

Read file first, then replace entire content:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

const SUMBER_OPTIONS = ['PENJUALAN', 'DEPOSIT', 'LAIN']
const METODE_OPTIONS = [
  { value: 'CASH',          label: 'Tunai' },
  { value: 'TRANSFER_BCA',  label: 'Transfer BCA' },
  { value: 'TRANSFER_LAIN', label: 'Transfer Lain' },
]

interface RabOption {
  rab_id: number
  kategori: string
  selisih: number
}

interface TambahKasModalProps {
  onDone:  () => void
  onClose: () => void
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export function TambahKasModal({ onDone, onClose }: TambahKasModalProps) {
  const [form, setForm] = useState({
    tipe:          'MASUK',
    sumber:        'DEPOSIT',
    keterangan:    '',
    jumlah:        '',
    metode:        'CASH',
    tgl_transaksi: new Date().toISOString().slice(0, 10),
    rab_id:        '',
  })
  const [rabOptions, setRabOptions] = useState<RabOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    const musim = new Date().getFullYear()
    api.get(`/api/keuangan/rab/summary?musim=${musim}`)
      .then(r => setRabOptions(r.data.data ?? []))
      .catch(() => {})
  }, [])

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit() {
    if (!form.keterangan || !form.jumlah || !form.tgl_transaksi) {
      setError('Keterangan, jumlah, dan tanggal wajib diisi.')
      return
    }
    if (form.tipe === 'KELUAR' && !form.rab_id) {
      setError('Pilih pos RAB untuk kas keluar.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/keuangan/kas', {
        tipe:          form.tipe,
        sumber:        form.tipe === 'MASUK' ? form.sumber : undefined,
        keterangan:    form.keterangan,
        jumlah:        Number(form.jumlah),
        metode:        form.metode,
        tgl_transaksi: form.tgl_transaksi,
        rab_id:        form.tipe === 'KELUAR' ? Number(form.rab_id) : undefined,
      })
      onDone()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  const labelClass = 'text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-1 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-card w-full max-w-md p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-on-surface">Tambah Kas</h2>

        <div>
          <label className={labelClass}>Tipe</label>
          <div className="flex gap-2">
            {['MASUK', 'KELUAR'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('tipe', t)}
                className={`flex-1 py-2 rounded-lg text-sm font-body font-medium border transition-colors ${
                  form.tipe === t
                    ? t === 'MASUK'
                      ? 'bg-[#dcfce7] border-[#15803d] text-[#15803d]'
                      : 'bg-[#fee2e2] border-error text-error'
                    : 'border-surface-high text-on-surface-variant hover:bg-surface-low'
                }`}
              >
                {t === 'MASUK' ? 'Kas Masuk' : 'Kas Keluar'}
              </button>
            ))}
          </div>
        </div>

        {form.tipe === 'MASUK' ? (
          <div>
            <label className={labelClass}>Sumber</label>
            <select value={form.sumber} onChange={(e) => set('sumber', e.target.value)} className="input-field">
              {SUMBER_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className={labelClass}>Pos RAB *</label>
            <select
              value={form.rab_id}
              onChange={(e) => set('rab_id', e.target.value)}
              className="input-field"
            >
              <option value="">— Pilih pos RAB —</option>
              {rabOptions.map((r) => (
                <option key={r.rab_id} value={r.rab_id}>
                  {r.kategori} — Sisa {rupiah(r.selisih)}
                </option>
              ))}
            </select>
            {rabOptions.length === 0 && (
              <p className="text-xs text-on-surface-variant mt-1">
                Belum ada pos RAB untuk musim ini. Buat dulu di halaman RAB.
              </p>
            )}
          </div>
        )}

        <Input
          label="Keterangan"
          value={form.keterangan}
          onChange={(e) => set('keterangan', e.target.value)}
          placeholder="Mis. Beli pakan ternak"
        />
        <Input
          label="Jumlah (Rp)"
          type="number"
          min="1"
          value={form.jumlah}
          onChange={(e) => set('jumlah', e.target.value)}
          placeholder="5000000"
        />

        <div>
          <label className={labelClass}>Metode</label>
          <select value={form.metode} onChange={(e) => set('metode', e.target.value)} className="input-field">
            {METODE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <Input
          label="Tanggal"
          type="date"
          value={form.tgl_transaksi}
          onChange={(e) => set('tgl_transaksi', e.target.value)}
        />

        {error && (
          <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={submit} loading={saving} className="flex-1">Simpan</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | grep -i "error\|TambahKas" | head -20
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/USER/projects/simhq && git add "frontend/app/(dashboard)/keuangan/components/TambahKasModal.tsx"
git commit -m "feat(biop): kas keluar wajib pilih pos RAB dengan sisa anggaran"
```

---

## Done

- RAB kategori bisa custom — tambah/hapus dari halaman RAB
- Kas KELUAR di BIOP wajib pilih pos RAB (dropdown dengan sisa anggaran)
- RAB summary menghitung realisasi dari dua jalur: RealisasiPengeluaran (RAB page) + KasHarian KELUAR (BIOP page)
- Double-count dihindari: KasHarian dari storeRealisasi tidak punya rab_id
