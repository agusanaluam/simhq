# T-20 Kendali Kesehatan & Riwayat Hewan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Daily health log per animal (kondisi + bobot + catatan + tindakan medis), death recording (auto-update hewan status → MATI), WA alert on KRITIS/MATI, mortality report.

**Architecture:** Two new tables: `riwayat_hewan` (daily health log) and `kematian_hewan` (death record). `KesehatanController` exposes health log CRUD, kematian (with hewan status update in transaction), and mortalitas summary. WA alerts triggered via WahaService on KRITIS/MATI. Frontend extends existing hewan detail page (`/depot/pengadaan/[id]/page.tsx`) with health log section. New mortalitas page at `/laporan/mortalitas` added to sidebar.

**Tech Stack:** Laravel 11, Next.js 14 App Router, TypeScript, PHPUnit TDD

---

## File Map

### Backend — Create
```
backend/
  database/migrations/2026_04_24_800000_create_riwayat_hewan_table.php
  database/migrations/2026_04_24_800001_create_kematian_hewan_table.php
  app/Models/RiwayatHewan.php
  app/Models/KematianHewan.php
  app/Http/Controllers/KesehatanController.php
  tests/Feature/Hewan/KesehatanTest.php
```

### Backend — Modify
```
backend/routes/api.php  (add hewan/mortalitas static + riwayat/kematian routes)
```

### Frontend — Create
```
frontend/app/(dashboard)/laporan/mortalitas/page.tsx
```

### Frontend — Modify
```
frontend/app/(dashboard)/depot/pengadaan/[id]/page.tsx  (add health log section)
frontend/components/shared/Sidebar.tsx                  (add Activity + /laporan/mortalitas)
```

---

## Task 1: Migrations + Models

**Files:**
- Create: `backend/database/migrations/2026_04_24_800000_create_riwayat_hewan_table.php`
- Create: `backend/database/migrations/2026_04_24_800001_create_kematian_hewan_table.php`
- Create: `backend/app/Models/RiwayatHewan.php`
- Create: `backend/app/Models/KematianHewan.php`

- [ ] **Step 1: Create riwayat_hewan migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('riwayat_hewan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hewan_id')->constrained('hewan')->cascadeOnDelete();
            $table->date('tgl');
            $table->enum('kondisi', ['SEHAT', 'SAKIT', 'KRITIS', 'MATI']);
            $table->decimal('bobot', 6, 2)->nullable();
            $table->text('catatan')->nullable();
            $table->text('tindakan_medis')->nullable();
            $table->string('obat', 200)->nullable();
            $table->foreignId('petugas_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('riwayat_hewan');
    }
};
```

Save to `backend/database/migrations/2026_04_24_800000_create_riwayat_hewan_table.php`.

- [ ] **Step 2: Create kematian_hewan migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('kematian_hewan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hewan_id')->constrained('hewan')->cascadeOnDelete();
            $table->date('tgl');
            $table->string('penyebab', 300);
            $table->enum('status_daging', ['TERPOTONG', 'TIDAK_TERPOTONG'])->default('TIDAK_TERPOTONG');
            $table->foreignId('petugas_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kematian_hewan');
    }
};
```

Save to `backend/database/migrations/2026_04_24_800001_create_kematian_hewan_table.php`.

- [ ] **Step 3: Create RiwayatHewan model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiwayatHewan extends Model
{

    protected $table = 'riwayat_hewan';

    protected $fillable = [
        'hewan_id', 'tgl', 'kondisi', 'bobot', 'catatan',
        'tindakan_medis', 'obat', 'petugas_id',
    ];

    protected $casts = [
        'tgl'   => 'date',
        'bobot' => 'decimal:2',
    ];

    public function hewan(): BelongsTo   { return $this->belongsTo(Hewan::class); }
    public function petugas(): BelongsTo { return $this->belongsTo(User::class, 'petugas_id'); }
}
```

Save to `backend/app/Models/RiwayatHewan.php`.

- [ ] **Step 4: Create KematianHewan model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KematianHewan extends Model
{

    protected $table = 'kematian_hewan';

    protected $fillable = ['hewan_id', 'tgl', 'penyebab', 'status_daging', 'petugas_id'];

    protected $casts = ['tgl' => 'date'];

    public function hewan(): BelongsTo   { return $this->belongsTo(Hewan::class); }
    public function petugas(): BelongsTo { return $this->belongsTo(User::class, 'petugas_id'); }
}
```

Save to `backend/app/Models/KematianHewan.php`.

- [ ] **Step 5: Run migrations**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan migrate
```

Expected: both tables migrated.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/2026_04_24_800000_create_riwayat_hewan_table.php \
        backend/database/migrations/2026_04_24_800001_create_kematian_hewan_table.php \
        backend/app/Models/RiwayatHewan.php \
        backend/app/Models/KematianHewan.php
git commit -m "feat(kesehatan): add riwayat_hewan + kematian_hewan migrations and models"
```

---

## Task 2: Write Failing KesehatanTest (TDD)

**Files:**
- Create: `backend/tests/Feature/Hewan/KesehatanTest.php`

- [ ] **Step 1: Write test file**

```php
<?php

namespace Tests\Feature\Hewan;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\KematianHewan;
use App\Models\RiwayatHewan;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class KesehatanTest extends TestCase
{
    use RefreshDatabase;

    private User  $kandang;
    private Depot $depot;
    private Hewan $hewan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->depot   = Depot::factory()->create();
        $this->kandang = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KANDANG_SAPI_KETUA,
        ]);

        $kelas        = KelasHewan::create(['kode' => 'A', 'nama' => 'Kelas A', 'urutan' => 1]);
        $supplier     = Supplier::create(['nama' => 'GUM', 'is_gum' => true, 'is_active' => true]);
        $this->hewan  = Hewan::create([
            'depot_id'      => $this->depot->id,
            'supplier_id'   => $supplier->id,
            'kelas_asal_id' => $kelas->id,
            'kelas_jual_id' => $kelas->id,
            'no_hewan'      => '001',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300.00,
            'tgl_masuk'     => today()->toDateString(),
            'musim'         => (int) date('Y'),
            'status'        => 'AVAILABLE',
        ]);
    }

    // ─── riwayat ─────────────────────────────────────────────────────────────

    public function test_kandang_can_add_riwayat_harian(): void
    {
        $res = $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/riwayat", [
                'tgl'     => today()->toDateString(),
                'kondisi' => 'SEHAT',
                'bobot'   => 310.50,
                'catatan' => 'Nafsu makan baik',
            ]);

        $res->assertCreated()->assertJsonPath('riwayat.kondisi', 'SEHAT');
        $this->assertDatabaseHas('riwayat_hewan', [
            'hewan_id' => $this->hewan->id,
            'kondisi'  => 'SEHAT',
        ]);
    }

    public function test_riwayat_validates_required_fields(): void
    {
        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/riwayat", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tgl', 'kondisi']);
    }

    public function test_riwayat_kritis_triggers_wa_alert(): void
    {
        Http::fake(['*' => Http::response([], 200)]);
        config(['services.waha.url' => 'http://localhost:3000']);

        User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
            'phone'    => '081234567890',
        ]);

        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/riwayat", [
                'tgl'     => today()->toDateString(),
                'kondisi' => 'KRITIS',
                'catatan' => 'Tidak mau makan',
            ]);

        $this->assertDatabaseHas('wa_log', ['triggered_by' => 'hewan_kritis']);
    }

    public function test_kandang_can_list_riwayat(): void
    {
        RiwayatHewan::create([
            'hewan_id' => $this->hewan->id, 'tgl' => today()->toDateString(),
            'kondisi' => 'SEHAT', 'petugas_id' => $this->kandang->id,
        ]);

        $res = $this->actingAs($this->kandang)
            ->getJson("/api/hewan/{$this->hewan->id}/riwayat");

        $res->assertOk()->assertJsonStructure(['data' => [['id', 'tgl', 'kondisi']]]);
        $this->assertCount(1, $res->json('data'));
    }

    // ─── kematian ─────────────────────────────────────────────────────────────

    public function test_kandang_can_record_kematian(): void
    {
        Http::fake(['*' => Http::response([], 200)]);
        config(['services.waha.url' => 'http://localhost:3000']);

        User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
            'phone'    => '081234567890',
        ]);

        $res = $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/kematian", [
                'tgl'          => today()->toDateString(),
                'penyebab'     => 'Penyakit pernapasan',
                'status_daging' => 'TIDAK_TERPOTONG',
            ]);

        $res->assertCreated()->assertJsonPath('kematian.penyebab', 'Penyakit pernapasan');
        $this->assertDatabaseHas('kematian_hewan', ['hewan_id' => $this->hewan->id]);
    }

    public function test_kematian_updates_hewan_status_to_mati(): void
    {
        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/kematian", [
                'tgl'      => today()->toDateString(),
                'penyebab' => 'Sakit',
            ]);

        $this->assertEquals('MATI', Hewan::find($this->hewan->id)->status->value);
    }

    public function test_kematian_validates_required_fields(): void
    {
        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/kematian", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tgl', 'penyebab']);
    }

    // ─── mortalitas ──────────────────────────────────────────────────────────

    public function test_mortalitas_returns_correct_summary(): void
    {
        // Mark hewan as MATI
        $this->hewan->update(['status' => 'MATI']);

        $res = $this->actingAs($this->kandang)
            ->getJson("/api/hewan/mortalitas?musim=" . date('Y'));

        $res->assertOk()->assertJsonStructure([
            'data' => [['jenis', 'total_hewan', 'total_mati', 'rasio_mortalitas']],
            'musim',
        ]);

        $sapi = collect($res->json('data'))->firstWhere('jenis', 'SAPI');
        $this->assertEquals(1, $sapi['total_mati']);
    }

    public function test_mortalitas_scoped_to_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        $kelas      = KelasHewan::first();
        $supplier   = Supplier::first();

        Hewan::create([
            'depot_id' => $otherDepot->id, 'supplier_id' => $supplier->id,
            'kelas_asal_id' => $kelas->id, 'kelas_jual_id' => $kelas->id,
            'no_hewan' => '001', 'jenis' => 'SAPI', 'bobot_masuk' => 200,
            'tgl_masuk' => today()->toDateString(), 'musim' => (int) date('Y'), 'status' => 'MATI',
        ]);

        $res = $this->actingAs($this->kandang)
            ->getJson("/api/hewan/mortalitas?musim=" . date('Y'));

        $sapi = collect($res->json('data'))->firstWhere('jenis', 'SAPI');
        // Other depot's MATI hewan not counted
        $this->assertEquals(0, $sapi['total_mati'] ?? 0);
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson("/api/hewan/{$this->hewan->id}/riwayat")->assertUnauthorized();
        $this->getJson('/api/hewan/mortalitas')->assertUnauthorized();
    }
}
```

Save to `backend/tests/Feature/Hewan/KesehatanTest.php`.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Hewan/KesehatanTest.php --no-coverage 2>&1 | tail -10
```

Expected: all FAIL with 404.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/tests/Feature/Hewan/KesehatanTest.php
git commit -m "test(kesehatan): add failing KesehatanTest (TDD)"
```

---

## Task 3: KesehatanController + Routes

**Files:**
- Create: `backend/app/Http/Controllers/KesehatanController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write KesehatanController**

```php
<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Hewan;
use App\Models\KematianHewan;
use App\Models\RiwayatHewan;
use App\Models\User;
use App\Services\WahaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KesehatanController extends Controller
{

    public function indexRiwayat(Hewan $hewan): JsonResponse
    {
        return response()->json([
            'data' => $hewan->riwayatKesehatan()
                ->with('petugas:id,name')
                ->orderBy('tgl', 'desc')
                ->orderBy('id', 'desc')
                ->get(),
        ]);
    }

    public function storeRiwayat(Request $request, Hewan $hewan): JsonResponse
    {
        $data = $request->validate([
            'tgl'           => ['required', 'date'],
            'kondisi'       => ['required', 'in:SEHAT,SAKIT,KRITIS,MATI'],
            'bobot'         => ['nullable', 'numeric', 'min:1', 'max:9999'],
            'catatan'       => ['nullable', 'string'],
            'tindakan_medis' => ['nullable', 'string'],
            'obat'          => ['nullable', 'string', 'max:200'],
        ]);

        $riwayat = RiwayatHewan::create(array_merge($data, [
            'hewan_id'  => $hewan->id,
            'petugas_id' => $request->user()?->id,
        ]));

        // Alert Kepala Depot if kondisi is KRITIS or MATI
        if (in_array($data['kondisi'], ['KRITIS', 'MATI'])) {
            $this->alertKepala($hewan, $data['kondisi']);
        }

        return response()->json(['riwayat' => $riwayat->load('petugas:id,name')], 201);
    }

    public function storeKematian(Request $request, Hewan $hewan): JsonResponse
    {
        $data = $request->validate([
            'tgl'           => ['required', 'date'],
            'penyebab'      => ['required', 'string', 'max:300'],
            'status_daging' => ['nullable', 'in:TERPOTONG,TIDAK_TERPOTONG'],
        ]);

        $kematian = DB::transaction(function () use ($hewan, $data, $request): KematianHewan {
            $kematian = KematianHewan::create(array_merge($data, [
                'hewan_id'   => $hewan->id,
                'petugas_id' => $request->user()?->id,
            ]));

            $hewan->update(['status' => 'MATI']);

            return $kematian;
        });

        $this->alertKepala($hewan, 'MATI');

        return response()->json(['kematian' => $kematian->load('petugas:id,name')], 201);
    }

    public function mortalitas(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;
        $musim   = (int) $request->input('musim', date('Y'));

        $rows = Hewan::where('depot_id', $depotId)
            ->where('musim', $musim)
            ->select('jenis',
                DB::raw('COUNT(*) as total_hewan'),
                DB::raw("SUM(CASE WHEN status = 'MATI' THEN 1 ELSE 0 END) as total_mati")
            )
            ->groupBy('jenis')
            ->orderBy('jenis')
            ->get()
            ->map(fn($r) => [
                'jenis'            => $r->jenis,
                'total_hewan'      => (int) $r->total_hewan,
                'total_mati'       => (int) $r->total_mati,
                'rasio_mortalitas' => $r->total_hewan > 0
                    ? round((int) $r->total_mati / (int) $r->total_hewan * 100, 1)
                    : 0.0,
            ]);

        return response()->json(['data' => $rows, 'musim' => $musim]);
    }

    private function alertKepala(Hewan $hewan, string $kondisi): void
    {
        $label = $kondisi === 'MATI' ? 'dilaporkan MATI' : 'dalam kondisi KRITIS';

        User::where('depot_id', $hewan->depot_id)
            ->where('role', UserRole::KEPALA_DEPOT)
            ->whereNotNull('phone')
            ->each(function (User $kd) use ($hewan, $label, $kondisi): void {
                WahaService::send(
                    $hewan->depot_id,
                    $kd->phone,
                    "ALERT: Hewan {$hewan->no_hewan} {$hewan->jenis} {$label}.",
                    'hewan_' . strtolower($kondisi)
                );
            });
    }
}
```

Save to `backend/app/Http/Controllers/KesehatanController.php`.

**Note:** `Hewan` model doesn't have a `riwayatKesehatan()` HasMany relation yet. Add it to `backend/app/Models/Hewan.php`:
```php
public function riwayatKesehatan(): HasMany { return $this->hasMany(RiwayatHewan::class); }
```

- [ ] **Step 2: Add riwayatKesehatan() HasMany to Hewan model**

In `backend/app/Models/Hewan.php`, add at the end of the class (before closing `}`):
```php
    public function riwayatKesehatan(): HasMany { return $this->hasMany(RiwayatHewan::class); }
    public function kematian(): HasMany          { return $this->hasMany(KematianHewan::class); }
```

`HasMany` is already imported in Hewan.php.

- [ ] **Step 3: Register routes in `backend/routes/api.php`**

Add `hewan/mortalitas` as static route BEFORE the existing `hewan/{hewan}` wildcard line. Insert after `Route::get('hewan/cetak-label', ...)`:

```php
    Route::get('hewan/mortalitas',          [\App\Http\Controllers\KesehatanController::class, 'mortalitas']);
```

Add riwayat + kematian routes AFTER the existing foto routes and BEFORE `Route::get('hewan/{hewan}', ...)`:

```php
    Route::get('hewan/{hewan}/riwayat',  [\App\Http\Controllers\KesehatanController::class, 'indexRiwayat']);
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,KANDANG_SAPI_KETUA,KANDANG_DOMBA_KETUA,KANDANG_SAPI_ANGGOTA,KANDANG_DOMBA_ANGGOTA')->group(function () {
        Route::post('hewan/{hewan}/riwayat',  [\App\Http\Controllers\KesehatanController::class, 'storeRiwayat']);
        Route::post('hewan/{hewan}/kematian', [\App\Http\Controllers\KesehatanController::class, 'storeKematian']);
    });
```

- [ ] **Step 4: Run tests — expect all 10 green**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Hewan/KesehatanTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 10 PASS. Fix any failures before continuing.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/KesehatanController.php \
        backend/app/Models/Hewan.php \
        backend/routes/api.php
git commit -m "feat(kesehatan): add KesehatanController + routes (riwayat, kematian, mortalitas)"
```

---

## Task 4: Frontend — Health Log on Hewan Detail + Mortalitas Page + Sidebar

**Files:**
- Modify: `frontend/app/(dashboard)/depot/pengadaan/[id]/page.tsx`
- Create: `frontend/app/(dashboard)/laporan/mortalitas/page.tsx`
- Modify: `frontend/components/shared/Sidebar.tsx`

- [ ] **Step 1: Add health log section to hewan detail page**

In `frontend/app/(dashboard)/depot/pengadaan/[id]/page.tsx`, make these changes:

**Add to interface HewanDetail** (add field for riwayat kesehatan — loaded separately):
No change needed to HewanDetail interface.

**Add state variables** after the `fotos` state:
```tsx
  const [riwayatList, setRiwayatList]   = useState<RiwayatItem[]>([])
  const [riwayatForm, setRiwayatForm]   = useState({ tgl: new Date().toISOString().slice(0, 10), kondisi: 'SEHAT', bobot: '', catatan: '' })
  const [riwayatSaving, setRiwayatSaving] = useState(false)
```

**Add RiwayatItem interface** near the top of the file:
```tsx
interface RiwayatItem { id: number; tgl: string; kondisi: string; bobot: string | null; catatan: string | null; petugas: { name: string } | null }
```

**Add loadRiwayat function** alongside loadData and loadFotos:
```tsx
  async function loadRiwayat() {
    const res = await api.get(`/api/hewan/${id}/riwayat`)
    setRiwayatList(res.data.data ?? [])
  }
```

**Update useEffect** to also call loadRiwayat:
```tsx
  useEffect(() => {
    if (!id) return
    api.get(`/api/hewan/${id}`).then(r => setHewan(r.data.hewan))
    loadFotos()
    loadRiwayat()
  }, [id])
```

**Add submitRiwayat function**:
```tsx
  async function submitRiwayat(e: React.FormEvent) {
    e.preventDefault()
    setRiwayatSaving(true)
    try {
      await api.post(`/api/hewan/${id}/riwayat`, {
        tgl:     riwayatForm.tgl,
        kondisi: riwayatForm.kondisi,
        bobot:   riwayatForm.bobot ? Number(riwayatForm.bobot) : undefined,
        catatan: riwayatForm.catatan || undefined,
      })
      setRiwayatForm({ tgl: new Date().toISOString().slice(0, 10), kondisi: 'SEHAT', bobot: '', catatan: '' })
      await loadRiwayat()
    } catch {
      alert('Gagal simpan riwayat.')
    } finally {
      setRiwayatSaving(false)
    }
  }
```

**Add Riwayat Kesehatan Card** in the JSX, AFTER the Riwayat Perpindahan Card:

```tsx
      {/* Riwayat Kesehatan */}
      <Card>
        <CardHeader><CardTitle>Riwayat Kesehatan</CardTitle></CardHeader>

        <form onSubmit={submitRiwayat} className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Tanggal</label>
            <input type="date" value={riwayatForm.tgl} onChange={(e) => setRiwayatForm(f => ({...f, tgl: e.target.value}))} className="input-field text-sm" />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Kondisi</label>
            <select value={riwayatForm.kondisi} onChange={(e) => setRiwayatForm(f => ({...f, kondisi: e.target.value}))} className="input-field text-sm">
              {['SEHAT','SAKIT','KRITIS','MATI'].map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Bobot (kg)</label>
            <input type="number" step="0.01" min="1" value={riwayatForm.bobot} onChange={(e) => setRiwayatForm(f => ({...f, bobot: e.target.value}))} className="input-field text-sm" placeholder="310.50" />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Catatan</label>
            <input type="text" value={riwayatForm.catatan} onChange={(e) => setRiwayatForm(f => ({...f, catatan: e.target.value}))} className="input-field text-sm" placeholder="Opsional" />
          </div>
          <div className="col-span-2">
            <Button type="submit" loading={riwayatSaving} className="w-full">Simpan Log Kondisi</Button>
          </div>
        </form>

        {riwayatList.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Belum ada riwayat kesehatan.</p>
        ) : (
          <div className="space-y-2">
            {riwayatList.map(r => {
              const color = r.kondisi === 'SEHAT' ? 'text-[#15803d]' : r.kondisi === 'KRITIS' || r.kondisi === 'MATI' ? 'text-error' : 'text-[#ca8a04]'
              return (
                <div key={r.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-surface-high last:border-0">
                  <span className="text-on-surface-variant w-24 flex-shrink-0">{r.tgl}</span>
                  <span className={`font-semibold ${color}`}>{r.kondisi}</span>
                  {r.bobot && <span className="text-on-surface-variant">{r.bobot} kg</span>}
                  {r.catatan && <span className="text-on-surface-variant">· {r.catatan}</span>}
                  {r.petugas && <span className="text-xs text-on-surface-variant ml-auto">{r.petugas.name}</span>}
                </div>
              )
            })}
          </div>
        )}
      </Card>
```

The complete modified hewan detail page should be written in full (not just the diff) to ensure correctness. Read the current file first, then write the complete updated version with all additions.

- [ ] **Step 2: Write mortalitas page**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface MortalitasRow {
  jenis:             string
  total_hewan:       number
  total_mati:        number
  rasio_mortalitas:  number
}

export default function MortalitasPage() {
  const currentYear = new Date().getFullYear()
  const [rows,    setRows]    = useState<MortalitasRow[]>([])
  const [musim,   setMusim]   = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/hewan/mortalitas?musim=${musim}`)
      setRows(res.data.data ?? [])
    } catch {
      setError('Gagal memuat data mortalitas.')
    } finally {
      setLoading(false)
    }
  }, [musim])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Laporan Mortalitas</h1>
          <p className="text-sm text-on-surface-variant mt-1">Rekap kematian hewan per musim</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Musim</label>
          <input type="number" min="2020" max="2099" value={musim}
            onChange={(e) => setMusim(Number(e.target.value))}
            className="input-field text-sm w-24" />
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <Card>
          {rows.length === 0 ? (
            <p className="text-center py-8 text-on-surface-variant text-sm">Belum ada data hewan musim {musim}.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high">
                  {['Jenis', 'Total Hewan', 'Total Mati', 'Rasio Mortalitas'].map((h) => (
                    <th key={h} className={`py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest ${
                      h === 'Jenis' ? 'text-left' : 'text-right'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.jenis} className="border-b border-surface-high last:border-0">
                    <td className="py-3 px-4 font-body font-medium text-on-surface">{r.jenis}</td>
                    <td className="py-3 px-4 font-display text-right text-on-surface">{r.total_hewan}</td>
                    <td className={`py-3 px-4 font-display font-semibold text-right ${r.total_mati > 0 ? 'text-error' : 'text-on-surface'}`}>
                      {r.total_mati}
                    </td>
                    <td className={`py-3 px-4 font-display font-semibold text-right ${r.rasio_mortalitas >= 5 ? 'text-error' : 'text-[#15803d]'}`}>
                      {r.rasio_mortalitas}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/laporan/mortalitas/page.tsx`.

- [ ] **Step 3: Update Sidebar**

In `frontend/components/shared/Sidebar.tsx`, add `Activity` to lucide-react import (after `Calculator`):
```tsx
  ..., Calculator, Activity
```

Add nav item AFTER `/laporan/income-statement`:
```tsx
  { href: '/laporan/income-statement', label: 'Income Statement',  icon: TrendingUp, roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
  { href: '/laporan/mortalitas',       label: 'Mortalitas Hewan',  icon: Activity,   roles: ['SUPER_ADMIN','KEPALA_DEPOT','KANDANG_SAPI_KETUA','KANDANG_DOMBA_KETUA'] },
```

- [ ] **Step 4: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output. Fix any errors.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/depot/pengadaan/[id]/page.tsx" \
        "frontend/app/(dashboard)/laporan/mortalitas/page.tsx" \
        frontend/components/shared/Sidebar.tsx
git commit -m "feat(kesehatan): add health log on hewan detail, mortalitas page, sidebar"
```

---

## Task 5: Verification + Close T-20

**Files:**
- Modify: `docs/tasks/T-20-kesehatan-hewan.md`
- Modify: `docs/TASKS.md`

- [ ] **Step 1: Run KesehatanTest**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Hewan/KesehatanTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 10 PASS.

- [ ] **Step 2: Run full test suite**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test --no-coverage 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -5
```

Expected: no output.

- [ ] **Step 4: Update T-20 task doc**

In `docs/tasks/T-20-kesehatan-hewan.md`:
- `**Status:** \`TODO\`` → `**Status:** \`DONE\``
- All `- [ ]` → `- [x]`
- Add to Notes: "Riwayat medis fields (tindakan_medis, obat) available in model/API but not in frontend form for MVP simplicity. Alert triggered via WahaService (silent skip if WAHA_API_URL not set)."

- [ ] **Step 5: Update TASKS.md**

- T-20 row: `⬜ TODO` → `✅ DONE`
- Phase 3 progress: `1 / 7` → `2 / 7`
- Summary: Phase 3 Selesai `1→2`, Sisa `6→5`; TOTAL Selesai `19→20`, Sisa `6→5`

- [ ] **Step 6: Commit + tag**

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-20-kesehatan-hewan.md docs/TASKS.md
git commit -m "docs: mark T-20 Kesehatan Hewan as DONE"
git tag t-20-complete
```

---

## Acceptance Criteria Checklist

- [ ] Log kondisi harian: SEHAT/SAKIT/KRITIS/MATI + bobot + catatan
- [ ] Kematian: record + auto-update hewan.status = MATI (in transaction)
- [ ] WA alert ke Kepala Depot on KRITIS or MATI
- [ ] Mortalitas summary by jenis: total/mati/rasio
- [ ] Mortalitas scoped to depot + filterable by musim
- [ ] Health log section on hewan detail page (mobile-friendly form)
- [ ] /laporan/mortalitas page + sidebar link
- [ ] All 10 backend tests pass
- [ ] Full suite passes
- [ ] TypeScript clean
