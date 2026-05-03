# T-19 Manajemen Pengiriman & Status Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Schedule and track animal deliveries — create schedule, assign petugas, update status (DIJADWALKAN→TERKIRIM), WA notify customer on schedule + departure. PHQ distribusi daging model included but UI deferred.

**Architecture:** Two new tables: `pengiriman` (delivery schedule per transaksi) and `distribusi_daging` (PHQ meat distribution per recipient). `PengirimanController` exposes create, list (with date/sesi/status filters, scoped to depot), updateStatus (triggers WA via WahaService), and rekap summary. No new sidebar entry needed — `/pengiriman` link already exists with Truck icon. Frontend: `/pengiriman/page.tsx` shows delivery list with date filter, sesi tabs, and big mobile-friendly status update buttons.

**Tech Stack:** Laravel 11, Next.js 14 App Router (Client Component), TypeScript, PHPUnit TDD

---

## File Map

### Backend — Create
```
backend/
  database/migrations/2026_04_24_700000_create_pengiriman_table.php
  database/migrations/2026_04_24_700001_create_distribusi_daging_table.php
  app/Models/Pengiriman.php
  app/Models/DistribusiDaging.php
  app/Http/Controllers/PengirimanController.php
  tests/Feature/Pengiriman/PengirimanTest.php
```

### Backend — Modify
```
backend/routes/api.php
```

### Frontend — Create
```
frontend/app/(dashboard)/pengiriman/
  page.tsx
  components/
    PengirimanCard.tsx
    JadwalModal.tsx
```

---

## Task 1: Migrations + Models

**Files:**
- Create: `backend/database/migrations/2026_04_24_700000_create_pengiriman_table.php`
- Create: `backend/database/migrations/2026_04_24_700001_create_distribusi_daging_table.php`
- Create: `backend/app/Models/Pengiriman.php`
- Create: `backend/app/Models/DistribusiDaging.php`

- [ ] **Step 1: Create pengiriman migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('pengiriman', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->foreignId('transaksi_id')->nullable()->constrained('transaksi')->nullOnDelete();
            $table->string('nama_penerima', 150);
            $table->text('alamat');
            $table->string('kelurahan', 100)->nullable();
            $table->string('kecamatan', 100)->nullable();
            $table->string('kota', 100)->nullable();
            $table->text('patokan')->nullable();
            $table->string('no_hp1', 20);
            $table->string('no_hp2', 20)->nullable();
            $table->date('tgl_kirim');
            $table->enum('sesi', ['PAGI', 'SIANG', 'SORE', 'MALAM'])->default('PAGI');
            $table->enum('status', ['DIJADWALKAN', 'DIAMBIL', 'DALAM_PERJALANAN', 'TERKIRIM'])
                  ->default('DIJADWALKAN');
            $table->foreignId('petugas_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('tgl_berangkat')->nullable();
            $table->timestamp('tgl_sampai')->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengiriman');
    }
};
```

Save to `backend/database/migrations/2026_04_24_700000_create_pengiriman_table.php`.

- [ ] **Step 2: Create distribusi_daging migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('distribusi_daging', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pengiriman_id')->constrained('pengiriman')->cascadeOnDelete();
            $table->string('nama_penerima', 150);
            $table->text('alamat')->nullable();
            $table->string('no_hp', 20)->nullable();
            $table->unsignedSmallInteger('qty_daging')->default(0);
            $table->unsignedSmallInteger('qty_tulang')->default(0);
            $table->unsignedSmallInteger('qty_jeroan')->default(0);
            $table->enum('status', ['MENUNGGU', 'TERKIRIM'])->default('MENUNGGU');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('distribusi_daging');
    }
};
```

Save to `backend/database/migrations/2026_04_24_700001_create_distribusi_daging_table.php`.

- [ ] **Step 3: Create Pengiriman model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pengiriman extends Model
{

    protected $table = 'pengiriman';

    protected $fillable = [
        'depot_id', 'transaksi_id', 'nama_penerima', 'alamat', 'kelurahan',
        'kecamatan', 'kota', 'patokan', 'no_hp1', 'no_hp2',
        'tgl_kirim', 'sesi', 'status', 'petugas_id',
        'tgl_berangkat', 'tgl_sampai', 'catatan',
    ];

    protected $casts = [
        'tgl_kirim'     => 'date',
        'tgl_berangkat' => 'datetime',
        'tgl_sampai'    => 'datetime',
    ];

    public function depot(): BelongsTo      { return $this->belongsTo(Depot::class); }
    public function transaksi(): BelongsTo  { return $this->belongsTo(Transaksi::class); }
    public function petugas(): BelongsTo    { return $this->belongsTo(User::class, 'petugas_id'); }
    public function distribusi(): HasMany   { return $this->hasMany(DistribusiDaging::class); }
}
```

Save to `backend/app/Models/Pengiriman.php`.

- [ ] **Step 4: Create DistribusiDaging model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DistribusiDaging extends Model
{

    protected $table = 'distribusi_daging';

    protected $fillable = [
        'pengiriman_id', 'nama_penerima', 'alamat', 'no_hp',
        'qty_daging', 'qty_tulang', 'qty_jeroan', 'status',
    ];

    public function pengiriman(): BelongsTo { return $this->belongsTo(Pengiriman::class); }
}
```

Save to `backend/app/Models/DistribusiDaging.php`.

- [ ] **Step 5: Run migrations**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan migrate
```

Expected: both tables migrated.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/2026_04_24_700000_create_pengiriman_table.php \
        backend/database/migrations/2026_04_24_700001_create_distribusi_daging_table.php \
        backend/app/Models/Pengiriman.php \
        backend/app/Models/DistribusiDaging.php
git commit -m "feat(pengiriman): add pengiriman + distribusi_daging migrations and models"
```

---

## Task 2: Write Failing PengirimanTest (TDD)

**Files:**
- Create: `backend/tests/Feature/Pengiriman/PengirimanTest.php`

- [ ] **Step 1: Write test file**

```php
<?php

namespace Tests\Feature\Pengiriman;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\Pengiriman;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PengirimanTest extends TestCase
{
    use RefreshDatabase;

    private User  $logistik;
    private Depot $depot;
    private int   $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot    = Depot::factory()->create();
        $this->logistik = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::LOGISTIK_KETUA,
        ]);
    }

    private function makePengiriman(array $attrs = []): Pengiriman
    {
        $this->seq++;
        return Pengiriman::create(array_merge([
            'depot_id'      => $this->depot->id,
            'nama_penerima' => "Pembeli {$this->seq}",
            'alamat'        => 'Jl. Test No. 1',
            'no_hp1'        => '081234567890',
            'tgl_kirim'     => '2026-06-01',
            'sesi'          => 'PAGI',
            'status'        => 'DIJADWALKAN',
        ], $attrs));
    }

    // ─── create ──────────────────────────────────────────────────────────────

    public function test_logistik_can_create_pengiriman(): void
    {
        $res = $this->actingAs($this->logistik)->postJson('/api/pengiriman', [
            'nama_penerima' => 'Ahmad Fauzi',
            'alamat'        => 'Jl. Mawar 5',
            'no_hp1'        => '081234567890',
            'tgl_kirim'     => '2026-06-01',
            'sesi'          => 'PAGI',
        ]);

        $res->assertCreated()->assertJsonPath('pengiriman.nama_penerima', 'Ahmad Fauzi');
        $this->assertDatabaseHas('pengiriman', [
            'nama_penerima' => 'Ahmad Fauzi',
            'status'        => 'DIJADWALKAN',
            'depot_id'      => $this->depot->id,
        ]);
    }

    public function test_create_validates_required_fields(): void
    {
        $this->actingAs($this->logistik)->postJson('/api/pengiriman', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nama_penerima', 'alamat', 'no_hp1', 'tgl_kirim', 'sesi']);
    }

    public function test_create_rejects_invalid_sesi(): void
    {
        $this->actingAs($this->logistik)->postJson('/api/pengiriman', [
            'nama_penerima' => 'Test', 'alamat' => 'Jl. A',
            'no_hp1' => '081', 'tgl_kirim' => '2026-06-01', 'sesi' => 'DINI_HARI',
        ])->assertUnprocessable()->assertJsonValidationErrors(['sesi']);
    }

    // ─── list ────────────────────────────────────────────────────────────────

    public function test_logistik_can_list_pengiriman(): void
    {
        $this->makePengiriman();
        $this->makePengiriman(['sesi' => 'SORE']);

        $res = $this->actingAs($this->logistik)->getJson('/api/pengiriman');

        $res->assertOk()->assertJsonStructure([
            'data' => [['id', 'nama_penerima', 'sesi', 'status', 'tgl_kirim']],
        ]);
        $this->assertCount(2, $res->json('data'));
    }

    public function test_list_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        Pengiriman::create([
            'depot_id' => $otherDepot->id, 'nama_penerima' => 'Other',
            'alamat' => 'X', 'no_hp1' => '0800', 'tgl_kirim' => '2026-06-01', 'sesi' => 'PAGI',
        ]);
        $this->makePengiriman();

        $res = $this->actingAs($this->logistik)->getJson('/api/pengiriman');

        $this->assertCount(1, $res->json('data'));
    }

    public function test_list_filterable_by_tgl_dan_sesi(): void
    {
        $this->makePengiriman(['tgl_kirim' => '2026-06-01', 'sesi' => 'PAGI']);
        $this->makePengiriman(['tgl_kirim' => '2026-06-01', 'sesi' => 'SORE']);
        $this->makePengiriman(['tgl_kirim' => '2026-06-02', 'sesi' => 'PAGI']);

        $res = $this->actingAs($this->logistik)
            ->getJson('/api/pengiriman?tgl=2026-06-01&sesi=PAGI');

        $this->assertCount(1, $res->json('data'));
    }

    // ─── update status ────────────────────────────────────────────────────────

    public function test_logistik_can_update_status(): void
    {
        $p = $this->makePengiriman();

        $res = $this->actingAs($this->logistik)
            ->putJson("/api/pengiriman/{$p->id}/status", ['status' => 'DIAMBIL']);

        $res->assertOk()->assertJsonPath('pengiriman.status', 'DIAMBIL');
        $this->assertDatabaseHas('pengiriman', ['id' => $p->id, 'status' => 'DIAMBIL']);
    }

    public function test_update_status_sets_tgl_berangkat_when_dalam_perjalanan(): void
    {
        $p = $this->makePengiriman();

        $this->actingAs($this->logistik)
            ->putJson("/api/pengiriman/{$p->id}/status", ['status' => 'DALAM_PERJALANAN']);

        $this->assertNotNull(Pengiriman::find($p->id)->tgl_berangkat);
    }

    public function test_update_status_sets_tgl_sampai_when_terkirim(): void
    {
        $p = $this->makePengiriman();

        $this->actingAs($this->logistik)
            ->putJson("/api/pengiriman/{$p->id}/status", ['status' => 'TERKIRIM']);

        $this->assertNotNull(Pengiriman::find($p->id)->tgl_sampai);
    }

    public function test_cannot_update_other_depots_pengiriman(): void
    {
        $otherDepot = Depot::factory()->create();
        $p = Pengiriman::create([
            'depot_id' => $otherDepot->id, 'nama_penerima' => 'Other',
            'alamat' => 'X', 'no_hp1' => '0800', 'tgl_kirim' => '2026-06-01', 'sesi' => 'PAGI',
        ]);

        $this->actingAs($this->logistik)
            ->putJson("/api/pengiriman/{$p->id}/status", ['status' => 'DIAMBIL'])
            ->assertForbidden();
    }

    // ─── rekap ───────────────────────────────────────────────────────────────

    public function test_rekap_returns_summary_per_sesi(): void
    {
        $this->makePengiriman(['tgl_kirim' => '2026-06-01', 'sesi' => 'PAGI', 'status' => 'DIJADWALKAN']);
        $this->makePengiriman(['tgl_kirim' => '2026-06-01', 'sesi' => 'PAGI', 'status' => 'TERKIRIM']);
        $this->makePengiriman(['tgl_kirim' => '2026-06-01', 'sesi' => 'SORE', 'status' => 'DIJADWALKAN']);

        $res = $this->actingAs($this->logistik)
            ->getJson('/api/pengiriman/rekap?tgl=2026-06-01');

        $res->assertOk()->assertJsonStructure(['data' => [['sesi', 'total', 'terkirim', 'belum']]]);

        $pagi = collect($res->json('data'))->firstWhere('sesi', 'PAGI');
        $this->assertEquals(2, $pagi['total']);
        $this->assertEquals(1, $pagi['terkirim']);
        $this->assertEquals(1, $pagi['belum']);
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/pengiriman')->assertUnauthorized();
        $this->postJson('/api/pengiriman', [])->assertUnauthorized();
    }
}
```

Save to `backend/tests/Feature/Pengiriman/PengirimanTest.php`.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Pengiriman/PengirimanTest.php --no-coverage 2>&1 | tail -10
```

Expected: all FAIL with 404.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/tests/Feature/Pengiriman/PengirimanTest.php
git commit -m "test(pengiriman): add failing PengirimanTest (TDD)"
```

---

## Task 3: PengirimanController + Routes

**Files:**
- Create: `backend/app/Http/Controllers/PengirimanController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write PengirimanController**

```php
<?php

namespace App\Http\Controllers;

use App\Models\Pengiriman;
use App\Services\WahaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PengirimanController extends Controller
{

    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $query = Pengiriman::where('depot_id', $depotId)
            ->with('petugas:id,name')
            ->orderBy('tgl_kirim')
            ->orderBy('sesi')
            ->orderBy('id');

        if ($request->tgl)    { $query->where('tgl_kirim', $request->tgl); }
        if ($request->sesi)   { $query->where('sesi', $request->sesi); }
        if ($request->status) { $query->where('status', $request->status); }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $data = $request->validate([
            'nama_penerima' => ['required', 'string', 'max:150'],
            'alamat'        => ['required', 'string'],
            'kelurahan'     => ['nullable', 'string', 'max:100'],
            'kecamatan'     => ['nullable', 'string', 'max:100'],
            'kota'          => ['nullable', 'string', 'max:100'],
            'patokan'       => ['nullable', 'string'],
            'no_hp1'        => ['required', 'string', 'max:20'],
            'no_hp2'        => ['nullable', 'string', 'max:20'],
            'tgl_kirim'     => ['required', 'date'],
            'sesi'          => ['required', 'in:PAGI,SIANG,SORE,MALAM'],
            'transaksi_id'  => ['nullable', 'exists:transaksi,id'],
            'petugas_id'    => ['nullable', 'exists:users,id'],
            'catatan'       => ['nullable', 'string'],
        ]);

        $pengiriman = Pengiriman::create(array_merge($data, [
            'depot_id' => $depotId,
            'status'   => 'DIJADWALKAN',
        ]));

        // Notify customer via WA
        WahaService::send(
            $depotId,
            $pengiriman->no_hp1,
            "Hewan qurban Anda akan dikirim pada {$pengiriman->tgl_kirim->format('d/m/Y')} sesi {$pengiriman->sesi} ke {$pengiriman->alamat}.",
            'pengiriman_dijadwalkan'
        );

        return response()->json(['pengiriman' => $pengiriman->load('petugas:id,name')], 201);
    }

    public function updateStatus(Request $request, Pengiriman $pengiriman): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        abort_unless((int) $pengiriman->depot_id === (int) $depotId, 403);

        $data = $request->validate([
            'status' => ['required', 'in:DIJADWALKAN,DIAMBIL,DALAM_PERJALANAN,TERKIRIM'],
        ]);

        $updates = ['status' => $data['status']];

        if ($data['status'] === 'DALAM_PERJALANAN' && !$pengiriman->tgl_berangkat) {
            $updates['tgl_berangkat'] = now();

            WahaService::send(
                $pengiriman->depot_id,
                $pengiriman->no_hp1,
                "Hewan qurban Anda sedang dalam perjalanan ke {$pengiriman->alamat}.",
                'pengiriman_berangkat'
            );
        }

        if ($data['status'] === 'TERKIRIM' && !$pengiriman->tgl_sampai) {
            $updates['tgl_sampai'] = now();
        }

        $pengiriman->update($updates);

        return response()->json(['pengiriman' => $pengiriman->fresh()]);
    }

    public function rekap(Request $request): JsonResponse
    {
        $request->validate(['tgl' => ['required', 'date']]);

        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $rows = Pengiriman::where('depot_id', $depotId)
            ->where('tgl_kirim', $request->tgl)
            ->select('sesi', DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN status = 'TERKIRIM' THEN 1 ELSE 0 END) as terkirim"))
            ->groupBy('sesi')
            ->orderBy('sesi')
            ->get()
            ->map(fn($r) => [
                'sesi'     => $r->sesi,
                'total'    => (int) $r->total,
                'terkirim' => (int) $r->terkirim,
                'belum'    => (int) $r->total - (int) $r->terkirim,
            ]);

        return response()->json(['data' => $rows, 'tgl' => $request->tgl]);
    }
}
```

Save to `backend/app/Http/Controllers/PengirimanController.php`.

Note: A `PengirimanController` likely already exists (from T-05 routes). Check first:
```bash
ls /c/Users/USER/projects/simhq/backend/app/Http/Controllers/PengirimanController.php 2>/dev/null
```
If it exists, read it and merge — don't overwrite. If it doesn't exist, create the new file.

- [ ] **Step 2: Register routes in `backend/routes/api.php`**

A `pengiriman` route section likely already exists. Check:
```bash
grep -n "pengiriman" /c/Users/USER/projects/simhq/backend/routes/api.php
```

If no `/pengiriman` routes exist, add inside auth:sanctum. The `rekap` static route MUST come before `{pengiriman}` wildcard:

```php
// Pengiriman
Route::middleware('auth:sanctum')->group(function () {
    // (already inside auth:sanctum — add these routes)
    Route::get('pengiriman/rekap',               [\App\Http\Controllers\PengirimanController::class, 'rekap']);
    Route::get('pengiriman',                      [\App\Http\Controllers\PengirimanController::class, 'index']);
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,LOGISTIK_KETUA,LOGISTIK_ANGGOTA')->group(function () {
        Route::post('pengiriman',                              [\App\Http\Controllers\PengirimanController::class, 'store']);
        Route::put('pengiriman/{pengiriman}/status',           [\App\Http\Controllers\PengirimanController::class, 'updateStatus']);
    });
});
```

If routes already exist, verify and only add missing ones.

- [ ] **Step 3: Run tests — expect all 12 green**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Pengiriman/PengirimanTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 12 PASS. Fix any failures.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/PengirimanController.php backend/routes/api.php
git commit -m "feat(pengiriman): add PengirimanController + routes (index, store, updateStatus, rekap)"
```

---

## Task 4: Frontend — Pengiriman Page + Components

**Files:**
- Create: `frontend/app/(dashboard)/pengiriman/components/PengirimanCard.tsx`
- Create: `frontend/app/(dashboard)/pengiriman/components/JadwalModal.tsx`
- Create: `frontend/app/(dashboard)/pengiriman/page.tsx`

- [ ] **Step 1: Write PengirimanCard**

```tsx
interface PengirimanCardProps {
  id:            number
  nama_penerima: string
  alamat:        string
  no_hp1:        string
  sesi:          string
  status:        string
  petugas:       { name: string } | null
  onStatusChange: (id: number, status: string) => void
}

const STATUS_NEXT: Record<string, string | null> = {
  DIJADWALKAN:      'DIAMBIL',
  DIAMBIL:          'DALAM_PERJALANAN',
  DALAM_PERJALANAN: 'TERKIRIM',
  TERKIRIM:         null,
}

const STATUS_LABEL: Record<string, string> = {
  DIJADWALKAN:      'Dijadwalkan',
  DIAMBIL:          'Diambil',
  DALAM_PERJALANAN: 'Dalam Perjalanan',
  TERKIRIM:         'Terkirim',
}

const STATUS_COLOR: Record<string, string> = {
  DIJADWALKAN:      'bg-blue-100 text-blue-700',
  DIAMBIL:          'bg-yellow-100 text-yellow-700',
  DALAM_PERJALANAN: 'bg-orange-100 text-orange-700',
  TERKIRIM:         'bg-green-100 text-green-700',
}

const NEXT_LABEL: Record<string, string> = {
  DIJADWALKAN:      '→ Diambil',
  DIAMBIL:          '→ Berangkat',
  DALAM_PERJALANAN: '→ Terkirim',
}

export function PengirimanCard({ id, nama_penerima, alamat, no_hp1, sesi, status, petugas, onStatusChange }: PengirimanCardProps) {
  const nextStatus = STATUS_NEXT[status]

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-gray-900">{nama_penerima}</p>
          <p className="text-sm text-gray-500 mt-0.5">{alamat}</p>
        </div>
        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-700'}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <a href={`https://wa.me/62${no_hp1.replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer"
           className="text-green-600 hover:underline">
          {no_hp1}
        </a>
        {petugas && <span>· Petugas: {petugas.name}</span>}
      </div>
      {nextStatus && (
        <button
          onClick={() => onStatusChange(id, nextStatus)}
          className="w-full py-3 mt-1 bg-primary text-on-primary font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          {NEXT_LABEL[status]}
        </button>
      )}
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/pengiriman/components/PengirimanCard.tsx`.

- [ ] **Step 2: Write JadwalModal**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

const SESI_OPTIONS = ['PAGI', 'SIANG', 'SORE', 'MALAM']

interface JadwalModalProps {
  onDone:  () => void
  onClose: () => void
}

export function JadwalModal({ onDone, onClose }: JadwalModalProps) {
  const [form, setForm] = useState({
    nama_penerima: '',
    alamat:        '',
    no_hp1:        '',
    tgl_kirim:     new Date().toISOString().slice(0, 10),
    sesi:          'PAGI',
    catatan:       '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.nama_penerima || !form.alamat || !form.no_hp1) {
      setError('Nama, alamat, dan no. HP wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/pengiriman', form)
      onDone()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  const labelClass = 'text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-1 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display font-semibold text-lg text-on-surface">Jadwalkan Pengiriman</h2>

        <Input label="Nama Penerima" value={form.nama_penerima} onChange={(e) => set('nama_penerima', e.target.value)} placeholder="Ahmad Fauzi" />
        <Input label="Alamat Lengkap" value={form.alamat} onChange={(e) => set('alamat', e.target.value)} placeholder="Jl. Mawar No. 5, RT 03/RW 04" />
        <Input label="No. HP Penerima" type="tel" value={form.no_hp1} onChange={(e) => set('no_hp1', e.target.value)} placeholder="081234567890" />
        <Input label="Tanggal Kirim" type="date" value={form.tgl_kirim} onChange={(e) => set('tgl_kirim', e.target.value)} />

        <div>
          <label className={labelClass}>Sesi</label>
          <div className="grid grid-cols-4 gap-2">
            {SESI_OPTIONS.map((s) => (
              <button key={s} type="button" onClick={() => set('sesi', s)}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.sesi === s ? 'bg-primary text-on-primary border-primary' : 'border-surface-high text-on-surface-variant hover:bg-surface-low'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <Input label="Catatan (opsional)" value={form.catatan} onChange={(e) => set('catatan', e.target.value)} placeholder="Patokan, instruksi khusus, dll." />

        {error && <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={submit} loading={saving} className="flex-1">Simpan</Button>
        </div>
      </div>
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/pengiriman/components/JadwalModal.tsx`.

- [ ] **Step 3: Write pengiriman page**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PengirimanCard } from './components/PengirimanCard'
import { JadwalModal }    from './components/JadwalModal'
import api from '@/lib/api'

interface PengirimanRow {
  id:            number
  nama_penerima: string
  alamat:        string
  no_hp1:        string
  tgl_kirim:     string
  sesi:          string
  status:        string
  petugas:       { name: string } | null
}

const SESI_OPTIONS = ['', 'PAGI', 'SIANG', 'SORE', 'MALAM']
const today        = new Date().toISOString().slice(0, 10)

export default function PengirimanPage() {
  const [rows,      setRows]      = useState<PengirimanRow[]>([])
  const [tgl,       setTgl]       = useState(today)
  const [sesi,      setSesi]      = useState('')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (tgl)  params.set('tgl',  tgl)
      if (sesi) params.set('sesi', sesi)
      const res = await api.get(`/api/pengiriman?${params}`)
      setRows(res.data.data ?? [])
    } catch {
      setError('Gagal memuat data pengiriman.')
    } finally {
      setLoading(false)
    }
  }, [tgl, sesi])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleStatusChange(id: number, status: string) {
    try {
      await api.put(`/api/pengiriman/${id}/status`, { status })
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
    } catch {
      alert('Gagal mengubah status.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Manajemen Pengiriman</h1>
          <p className="text-sm text-on-surface-variant mt-1">Jadwal & status pengiriman hewan qurban</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          Jadwalkan
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-surface rounded-lg">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Tanggal</label>
          <input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} className="input-field text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Sesi</label>
          <select value={sesi} onChange={(e) => setSesi(e.target.value)} className="input-field text-sm">
            {SESI_OPTIONS.map((s) => <option key={s} value={s}>{s || '— Semua —'}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <p>Tidak ada pengiriman untuk tanggal {tgl || 'ini'}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <PengirimanCard
              key={r.id}
              {...r}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {showModal && (
        <JadwalModal
          onDone={() => { setShowModal(false); fetchData() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/pengiriman/page.tsx`.

- [ ] **Step 4: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output. Fix any errors.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/pengiriman/"
git commit -m "feat(pengiriman): add pengiriman page with cards + JadwalModal"
```

---

## Task 5: Verification + Close T-19

**Files:**
- Modify: `docs/tasks/T-19-manajemen-pengiriman.md`
- Modify: `docs/TASKS.md`

- [ ] **Step 1: Run PengirimanTest**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Pengiriman/PengirimanTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 12 tests PASS.

- [ ] **Step 2: Run full test suite**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test --no-coverage 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -5
```

Expected: no output.

- [ ] **Step 4: Update T-19 task doc**

In `docs/tasks/T-19-manajemen-pengiriman.md`:
- `**Status:** \`TODO\`` → `**Status:** \`DONE\``
- All `- [ ]` → `- [x]`
- Add to Notes: "DistribusiDaging model + migration created but UI deferred. PHQ form input (distribusi daging) deferred. Page at /pengiriman (sidebar link already existed)."

- [ ] **Step 5: Update TASKS.md**

- T-19 row: `⬜ TODO` → `✅ DONE`
- Phase 3 progress: `0 / 7` → `1 / 7`
- Summary: Phase 3 Selesai `0→1`, Sisa `7→6`; TOTAL Selesai `18→19`, Sisa `7→6`

- [ ] **Step 6: Commit + tag**

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-19-manajemen-pengiriman.md docs/TASKS.md
git commit -m "docs: mark T-19 Manajemen Pengiriman as DONE"
git tag t-19-complete
```

---

## Acceptance Criteria Checklist

- [ ] Create pengiriman with nama, alamat, no_hp1, tgl_kirim, sesi
- [ ] Status tracking: DIJADWALKAN → DIAMBIL → DALAM_PERJALANAN → TERKIRIM
- [ ] tgl_berangkat set when status → DALAM_PERJALANAN
- [ ] tgl_sampai set when status → TERKIRIM
- [ ] WA notify on create (DIJADWALKAN) and on DALAM_PERJALANAN
- [ ] List filtered by tgl/sesi/status, scoped to depot
- [ ] Rekap summary per sesi (total/terkirim/belum)
- [ ] Frontend card grid with big status update buttons
- [ ] JadwalModal creates pengiriman
- [ ] All 12 backend tests pass
- [ ] Full suite passes
- [ ] TypeScript clean
