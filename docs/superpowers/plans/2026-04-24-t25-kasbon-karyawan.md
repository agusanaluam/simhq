# T-25 Modul Kasbon Karyawan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Salary advance (kasbon) CRUD — submit, approve (with installment config), reject, list, detail. Integration with upah calculation adds `potongan_kasbon` + `upah_bersih` columns to the upah report.

**Architecture:** Two new tables: `kasbon` (advance request per karyawan) and `cicilan_kasbon` (installment plan set by admin on approval). `KasbonController` exposes submit/approve/reject/list/detail. `SdmController.buildUpah()` extended to deduct active cicilan from upah per karyawan. `RealisasiCicilan` model is skipped for MVP — cicil_terbayar counter on `cicilan_kasbon` tracks progress. Frontend: `/sdm/kasbon` page (tabbed: PENDING/APPROVED/LUNAS), upah page gets 2 new columns.

**Tech Stack:** Laravel 11, Next.js 14, TypeScript, PHPUnit TDD

---

## File Map

### Backend — Create
```
backend/
  database/migrations/2026_04_24_950000_create_kasbon_table.php
  database/migrations/2026_04_24_950001_create_cicilan_kasbon_table.php
  app/Models/Kasbon.php
  app/Models/CicilanKasbon.php
  app/Http/Controllers/KasbonController.php
  tests/Feature/Sdm/KasbonTest.php
```

### Backend — Modify
```
backend/app/Http/Controllers/SdmController.php  (extend buildUpah + export)
backend/routes/api.php
```

### Frontend — Create
```
frontend/app/(dashboard)/sdm/kasbon/page.tsx
```

### Frontend — Modify
```
frontend/app/(dashboard)/admin/sdm/upah/page.tsx  (add potongan_kasbon + upah_bersih columns)
frontend/components/shared/Sidebar.tsx             (add CreditCard + /sdm/kasbon)
```

---

## Task 1: Migrations + Models

**Files:**
- Create: `backend/database/migrations/2026_04_24_950000_create_kasbon_table.php`
- Create: `backend/database/migrations/2026_04_24_950001_create_cicilan_kasbon_table.php`
- Create: `backend/app/Models/Kasbon.php`
- Create: `backend/app/Models/CicilanKasbon.php`

- [ ] **Step 1: Create kasbon migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('kasbon', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karyawan_id')->constrained('karyawan')->cascadeOnDelete();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->unsignedInteger('nominal');
            $table->text('alasan');
            $table->enum('status', ['PENDING', 'APPROVED', 'REJECTED', 'LUNAS'])->default('PENDING');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('tgl_approve')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kasbon');
    }
};
```

Save to `backend/database/migrations/2026_04_24_950000_create_kasbon_table.php`.

- [ ] **Step 2: Create cicilan_kasbon migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('cicilan_kasbon', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kasbon_id')->constrained('kasbon')->cascadeOnDelete();
            $table->unsignedInteger('nominal_cicilan');
            $table->unsignedSmallInteger('jumlah_cicil');
            $table->unsignedSmallInteger('cicil_terbayar')->default(0);
            $table->date('tgl_mulai');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cicilan_kasbon');
    }
};
```

Save to `backend/database/migrations/2026_04_24_950001_create_cicilan_kasbon_table.php`.

- [ ] **Step 3: Create Kasbon model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Kasbon extends Model
{

    protected $table = 'kasbon';

    protected $fillable = [
        'karyawan_id', 'depot_id', 'nominal', 'alasan',
        'status', 'approved_by', 'tgl_approve',
    ];

    protected $casts = [
        'nominal'    => 'integer',
        'tgl_approve' => 'date',
    ];

    public function karyawan(): BelongsTo   { return $this->belongsTo(Karyawan::class); }
    public function depot(): BelongsTo      { return $this->belongsTo(Depot::class); }
    public function approvedBy(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
    public function cicilan(): HasOne       { return $this->hasOne(CicilanKasbon::class); }
}
```

Save to `backend/app/Models/Kasbon.php`.

- [ ] **Step 4: Create CicilanKasbon model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CicilanKasbon extends Model
{

    protected $table = 'cicilan_kasbon';

    protected $fillable = [
        'kasbon_id', 'nominal_cicilan', 'jumlah_cicil', 'cicil_terbayar', 'tgl_mulai',
    ];

    protected $casts = [
        'nominal_cicilan' => 'integer',
        'jumlah_cicil'    => 'integer',
        'cicil_terbayar'  => 'integer',
        'tgl_mulai'       => 'date',
    ];

    public function kasbon(): BelongsTo { return $this->belongsTo(Kasbon::class); }
}
```

Save to `backend/app/Models/CicilanKasbon.php`.

- [ ] **Step 5: Run migrations**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan migrate
```

Expected: both tables migrated.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/2026_04_24_950000_create_kasbon_table.php \
        backend/database/migrations/2026_04_24_950001_create_cicilan_kasbon_table.php \
        backend/app/Models/Kasbon.php \
        backend/app/Models/CicilanKasbon.php
git commit -m "feat(kasbon): add kasbon + cicilan_kasbon migrations and models"
```

---

## Task 2: Write Failing KasbonTest (TDD)

**Files:**
- Create: `backend/tests/Feature/Sdm/KasbonTest.php`

- [ ] **Step 1: Write test file**

```php
<?php

namespace Tests\Feature\Sdm;

use App\Enums\UserRole;
use App\Models\CicilanKasbon;
use App\Models\Depot;
use App\Models\Kasbon;
use App\Models\Karyawan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KasbonTest extends TestCase
{
    use RefreshDatabase;

    private User     $kepala;
    private Depot    $depot;
    private Karyawan $karyawan;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot    = Depot::factory()->create();
        $this->kepala   = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
        ]);
        $this->karyawan = Karyawan::create([
            'depot_id' => $this->depot->id,
            'nama'     => 'Ahmad',
            'divisi'   => 'Kandang',
        ]);
    }

    private function makeKasbon(string $status = 'PENDING', int $nominal = 500_000): Kasbon
    {
        return Kasbon::create([
            'karyawan_id' => $this->karyawan->id,
            'depot_id'    => $this->depot->id,
            'nominal'     => $nominal,
            'alasan'      => 'Kebutuhan mendesak',
            'status'      => $status,
        ]);
    }

    // ─── submit ──────────────────────────────────────────────────────────────

    public function test_kepala_can_submit_kasbon_for_karyawan(): void
    {
        $res = $this->actingAs($this->kepala)->postJson('/api/sdm/kasbon', [
            'karyawan_id' => $this->karyawan->id,
            'nominal'     => 500_000,
            'alasan'      => 'Kebutuhan mendesak',
        ]);

        $res->assertCreated()->assertJsonPath('kasbon.status', 'PENDING');
        $this->assertDatabaseHas('kasbon', [
            'karyawan_id' => $this->karyawan->id,
            'status'      => 'PENDING',
        ]);
    }

    public function test_submit_validates_required_fields(): void
    {
        $this->actingAs($this->kepala)->postJson('/api/sdm/kasbon', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['karyawan_id', 'nominal', 'alasan']);
    }

    // ─── list ────────────────────────────────────────────────────────────────

    public function test_kepala_can_list_kasbon(): void
    {
        $this->makeKasbon('PENDING');
        $this->makeKasbon('APPROVED');

        $res = $this->actingAs($this->kepala)->getJson('/api/sdm/kasbon');

        $res->assertOk()->assertJsonStructure([
            'data' => [['id', 'nominal', 'alasan', 'status', 'karyawan']],
        ]);
        $this->assertCount(2, $res->json('data'));
    }

    public function test_list_filterable_by_status(): void
    {
        $this->makeKasbon('PENDING');
        $this->makeKasbon('APPROVED');

        $res = $this->actingAs($this->kepala)->getJson('/api/sdm/kasbon?status=PENDING');

        $this->assertCount(1, $res->json('data'));
        $this->assertEquals('PENDING', $res->json('data.0.status'));
    }

    public function test_list_scoped_to_own_depot(): void
    {
        $otherDepot    = Depot::factory()->create();
        $otherKaryawan = Karyawan::create(['depot_id' => $otherDepot->id, 'nama' => 'Other', 'divisi' => 'X']);
        Kasbon::create(['karyawan_id' => $otherKaryawan->id, 'depot_id' => $otherDepot->id,
            'nominal' => 1_000_000, 'alasan' => 'Other', 'status' => 'PENDING']);
        $this->makeKasbon();

        $res = $this->actingAs($this->kepala)->getJson('/api/sdm/kasbon');

        $this->assertCount(1, $res->json('data'));
    }

    // ─── approve ─────────────────────────────────────────────────────────────

    public function test_kepala_can_approve_kasbon(): void
    {
        $kasbon = $this->makeKasbon('PENDING');

        $res = $this->actingAs($this->kepala)
            ->putJson("/api/sdm/kasbon/{$kasbon->id}/approve", [
                'nominal_cicilan' => 100_000,
                'jumlah_cicil'    => 5,
                'tgl_mulai'       => today()->toDateString(),
            ]);

        $res->assertOk()->assertJsonPath('kasbon.status', 'APPROVED');
        $this->assertDatabaseHas('kasbon', ['id' => $kasbon->id, 'status' => 'APPROVED']);
        $this->assertDatabaseHas('cicilan_kasbon', [
            'kasbon_id'      => $kasbon->id,
            'nominal_cicilan' => 100_000,
            'jumlah_cicil'   => 5,
        ]);
    }

    public function test_approve_validates_cicilan_fields(): void
    {
        $kasbon = $this->makeKasbon('PENDING');

        $this->actingAs($this->kepala)
            ->putJson("/api/sdm/kasbon/{$kasbon->id}/approve", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nominal_cicilan', 'jumlah_cicil', 'tgl_mulai']);
    }

    // ─── reject ──────────────────────────────────────────────────────────────

    public function test_kepala_can_reject_kasbon(): void
    {
        $kasbon = $this->makeKasbon('PENDING');

        $res = $this->actingAs($this->kepala)
            ->putJson("/api/sdm/kasbon/{$kasbon->id}/reject");

        $res->assertOk()->assertJsonPath('kasbon.status', 'REJECTED');
    }

    // ─── upah integration ────────────────────────────────────────────────────

    public function test_upah_includes_potongan_kasbon(): void
    {
        // Create tarif upah for karyawan
        \App\Models\TarifUpah::create([
            'karyawan_id'  => $this->karyawan->id,
            'tarif_harian' => 100_000,
            'berlaku_dari' => '2026-04-01',
            'dibuat_oleh'  => $this->kepala->id,
        ]);

        // Kasbon APPROVED with cicilan 200_000/cicil
        $kasbon = $this->makeKasbon('APPROVED');
        CicilanKasbon::create([
            'kasbon_id'       => $kasbon->id,
            'nominal_cicilan' => 200_000,
            'jumlah_cicil'    => 3,
            'cicil_terbayar'  => 0,
            'tgl_mulai'       => '2026-04-01',
        ]);

        $res = $this->actingAs($this->kepala)
            ->getJson('/api/sdm/upah?tgl_dari=2026-04-01&tgl_sampai=2026-04-30');

        $res->assertOk();
        $row = collect($res->json('data'))->firstWhere('karyawan_id', $this->karyawan->id);
        $this->assertArrayHasKey('potongan_kasbon', $row);
        $this->assertEquals(200_000, $row['potongan_kasbon']);
        $this->assertArrayHasKey('upah_bersih', $row);
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/sdm/kasbon')->assertUnauthorized();
        $this->postJson('/api/sdm/kasbon', [])->assertUnauthorized();
    }
}
```

Save to `backend/tests/Feature/Sdm/KasbonTest.php`.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Sdm/KasbonTest.php --no-coverage 2>&1 | tail -10
```

Expected: all FAIL with 404.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/tests/Feature/Sdm/KasbonTest.php
git commit -m "test(kasbon): add failing KasbonTest (TDD)"
```

---

## Task 3: KasbonController + Routes + Upah Hook

**Files:**
- Create: `backend/app/Http/Controllers/KasbonController.php`
- Modify: `backend/app/Http/Controllers/SdmController.php` (extend buildUpah)
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create KasbonController**

```php
<?php

namespace App\Http\Controllers;

use App\Models\CicilanKasbon;
use App\Models\Kasbon;
use App\Models\Karyawan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KasbonController extends Controller
{

    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $query = Kasbon::where('depot_id', $depotId)
            ->with('karyawan:id,nama,divisi', 'cicilan')
            ->orderBy('created_at', 'desc');

        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->karyawan_id) {
            $query->where('karyawan_id', $request->karyawan_id);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $data = $request->validate([
            'karyawan_id' => ['required', 'integer', 'exists:karyawan,id'],
            'nominal'     => ['required', 'integer', 'min:1'],
            'alasan'      => ['required', 'string'],
        ]);

        abort_unless(
            Karyawan::where('id', $data['karyawan_id'])->where('depot_id', $depotId)->exists(),
            403
        );

        $kasbon = Kasbon::create(array_merge($data, [
            'depot_id' => $depotId,
            'status'   => 'PENDING',
        ]));

        return response()->json(['kasbon' => $kasbon->load('karyawan:id,nama')], 201);
    }

    public function approve(Request $request, Kasbon $kasbon): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        abort_unless((int) $kasbon->depot_id === (int) $depotId, 403);

        $data = $request->validate([
            'nominal_cicilan' => ['required', 'integer', 'min:1'],
            'jumlah_cicil'    => ['required', 'integer', 'min:1'],
            'tgl_mulai'       => ['required', 'date'],
        ]);

        $kasbon->update([
            'status'      => 'APPROVED',
            'approved_by' => $user->id,
            'tgl_approve' => today()->toDateString(),
        ]);

        CicilanKasbon::create(array_merge($data, [
            'kasbon_id'      => $kasbon->id,
            'cicil_terbayar' => 0,
        ]));

        return response()->json(['kasbon' => $kasbon->fresh()->load('karyawan:id,nama', 'cicilan')]);
    }

    public function reject(Request $request, Kasbon $kasbon): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        abort_unless((int) $kasbon->depot_id === (int) $depotId, 403);

        $kasbon->update(['status' => 'REJECTED']);

        return response()->json(['kasbon' => $kasbon->fresh()]);
    }
}
```

Save to `backend/app/Http/Controllers/KasbonController.php`.

- [ ] **Step 2: Extend SdmController.buildUpah() with potongan_kasbon**

In `backend/app/Http/Controllers/SdmController.php`, modify the `buildUpah()` private method.

Add import at top: `use App\Models\CicilanKasbon;`

In `buildUpah()`, after collecting `$hariHadir`, add a query for active cicilan:

```php
        // Active cicilan kasbon per karyawan (APPROVED, cicil_terbayar < jumlah_cicil)
        $activeCicilan = CicilanKasbon::whereHas('kasbon', fn($q) =>
            $q->where('depot_id', $depotId)->where('status', 'APPROVED')
        )
        ->where('cicil_terbayar', '<', \Illuminate\Support\Facades\DB::raw('jumlah_cicil'))
        ->with('kasbon:id,karyawan_id')
        ->get()
        ->groupBy(fn($c) => $c->kasbon->karyawan_id)
        ->map(fn($group) => $group->sum('nominal_cicilan'));
```

Then in the `map()` return array, add:

```php
            $potongan = (int) $activeCicilan->get($k->id, 0);
            return [
                'karyawan_id'     => $k->id,
                'nama'            => $k->nama,
                'divisi'          => $k->divisi,
                'hari_hadir'      => $hari,
                'tarif_harian'    => $tarif,
                'total_upah'      => $hari * $tarif,
                'potongan_kasbon' => $potongan,
                'upah_bersih'     => ($hari * $tarif) - $potongan,
            ];
```

The full updated `buildUpah()` method (complete replacement):

```php
    private function buildUpah(int $depotId, string $tglDari, string $tglSampai): array
    {
        $karyawanList = Karyawan::where('depot_id', $depotId)->get();

        // Latest tarif per karyawan where berlaku_dari <= tgl_sampai (SQLite-safe)
        $tarifs = collect();
        foreach ($karyawanList as $k) {
            $t = TarifUpah::where('karyawan_id', $k->id)
                ->where('berlaku_dari', '<=', $tglSampai)
                ->orderBy('berlaku_dari', 'desc')
                ->first();
            if ($t) {
                $tarifs->put($k->id, $t->tarif_harian);
            }
        }

        // Count hari hadir (HADIR + TERLAMBAT) per karyawan in date range
        $hariHadir = DB::table('absensi')
            ->whereIn('karyawan_id', $karyawanList->pluck('id'))
            ->whereBetween('tgl', [$tglDari, $tglSampai])
            ->whereIn('status', ['HADIR', 'TERLAMBAT'])
            ->select('karyawan_id', DB::raw('COUNT(*) as hari'))
            ->groupBy('karyawan_id')
            ->pluck('hari', 'karyawan_id');

        // Active cicilan kasbon per karyawan
        $activeCicilan = CicilanKasbon::whereHas('kasbon', fn($q) =>
            $q->where('depot_id', $depotId)->where('status', 'APPROVED')
        )
        ->whereColumn('cicil_terbayar', '<', 'jumlah_cicil')
        ->with('kasbon:id,karyawan_id')
        ->get()
        ->groupBy(fn($c) => $c->kasbon->karyawan_id)
        ->map(fn($group) => $group->sum('nominal_cicilan'));

        return $karyawanList->map(function (Karyawan $k) use ($tarifs, $hariHadir, $activeCicilan): array {
            $tarif    = (int) $tarifs->get($k->id, 0);
            $hari     = (int) $hariHadir->get($k->id, 0);
            $potongan = (int) $activeCicilan->get($k->id, 0);
            return [
                'karyawan_id'     => $k->id,
                'nama'            => $k->nama,
                'divisi'          => $k->divisi,
                'hari_hadir'      => $hari,
                'tarif_harian'    => $tarif,
                'total_upah'      => $hari * $tarif,
                'potongan_kasbon' => $potongan,
                'upah_bersih'     => ($hari * $tarif) - $potongan,
            ];
        })->values()->all();
    }
```

Also add `use App\Models\CicilanKasbon;` to the imports.

Note: `whereColumn('cicil_terbayar', '<', 'jumlah_cicil')` compares two columns — SQLite-safe.

Also update the CSV export in `export()` to include the new columns:
```php
fputcsv($h, ['Nama', 'Divisi', 'Hari Hadir', 'Tarif Harian', 'Total Upah', 'Potongan Kasbon', 'Upah Bersih']);
foreach ($rows as $row) {
    fputcsv($h, [
        $row['nama'],
        $row['divisi'],
        $row['hari_hadir'],
        $row['tarif_harian'],
        $row['total_upah'],
        $row['potongan_kasbon'],
        $row['upah_bersih'],
    ]);
}
```

- [ ] **Step 3: Register routes in `backend/routes/api.php`**

Inside auth:sanctum, add kasbon routes (after SDM section):

```php
// Kasbon Karyawan
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_KETUA')->group(function () {
    Route::get('sdm/kasbon',                     [\App\Http\Controllers\KasbonController::class, 'index']);
    Route::post('sdm/kasbon',                    [\App\Http\Controllers\KasbonController::class, 'store']);
    Route::put('sdm/kasbon/{kasbon}/approve',    [\App\Http\Controllers\KasbonController::class, 'approve']);
    Route::put('sdm/kasbon/{kasbon}/reject',     [\App\Http\Controllers\KasbonController::class, 'reject']);
});
```

Note: `approve` and `reject` routes — `approve` MUST come before `reject` if both match `{kasbon}/...`, but since the paths differ (`.../approve` vs `.../reject`) there's no conflict.

- [ ] **Step 4: Run tests — expect all 11 green**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Sdm/ --no-coverage 2>&1 | tail -15
```

Expected: all tests in Sdm/ directory PASS (both SdmTest + KasbonTest).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/KasbonController.php \
        backend/app/Http/Controllers/SdmController.php \
        backend/routes/api.php
git commit -m "feat(kasbon): add KasbonController, extend SdmController buildUpah with potongan_kasbon"
```

---

## Task 4: Frontend — Kasbon Page + Upah Update + Sidebar

**Files:**
- Create: `frontend/app/(dashboard)/sdm/kasbon/page.tsx`
- Modify: `frontend/app/(dashboard)/admin/sdm/upah/page.tsx`
- Modify: `frontend/components/shared/Sidebar.tsx`

- [ ] **Step 1: Write kasbon page**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface KasbonRow {
  id:       number
  nominal:  number
  alasan:   string
  status:   string
  karyawan: { id: number; nama: string; divisi: string } | null
  cicilan:  { nominal_cicilan: number; jumlah_cicil: number; cicil_terbayar: number } | null
  created_at: string
}

const STATUS_TABS = ['', 'PENDING', 'APPROVED', 'REJECTED', 'LUNAS']
const STATUS_BADGE: Record<string, string> = {
  PENDING:  'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  LUNAS:    'bg-blue-100 text-blue-700',
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function KasbonPage() {
  const [kasbon,  setKasbon]  = useState<KasbonRow[]>([])
  const [status,  setStatus]  = useState('')
  const [loading, setLoading] = useState(true)

  // Approve form state
  const [approving,     setApproving]     = useState<number | null>(null)
  const [approveForm,   setApproveForm]   = useState({ nominal_cicilan: '', jumlah_cicil: '', tgl_mulai: new Date().toISOString().slice(0, 10) })
  const [approveSaving, setApproveSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = status ? `?status=${status}` : ''
      const res = await api.get(`/api/sdm/kasbon${params}`)
      setKasbon(res.data.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleApprove(id: number) {
    if (!approveForm.nominal_cicilan || !approveForm.jumlah_cicil) return
    setApproveSaving(true)
    try {
      await api.put(`/api/sdm/kasbon/${id}/approve`, {
        nominal_cicilan: Number(approveForm.nominal_cicilan),
        jumlah_cicil:    Number(approveForm.jumlah_cicil),
        tgl_mulai:       approveForm.tgl_mulai,
      })
      setApproving(null)
      setApproveForm({ nominal_cicilan: '', jumlah_cicil: '', tgl_mulai: new Date().toISOString().slice(0, 10) })
      await fetchData()
    } catch {
      alert('Gagal approve.')
    } finally {
      setApproveSaving(false)
    }
  }

  async function handleReject(id: number) {
    if (!confirm('Tolak kasbon ini?')) return
    try {
      await api.put(`/api/sdm/kasbon/${id}/reject`)
      await fetchData()
    } catch {
      alert('Gagal reject.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Kasbon Karyawan</h1>
          <p className="text-sm text-on-surface-variant mt-1">Pengajuan pinjaman gaji karyawan</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-body transition-colors ${
              status === s
                ? 'bg-primary text-on-primary'
                : 'bg-surface text-on-surface-variant hover:bg-surface-high'
            }`}>
            {s || 'Semua'}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-surface rounded animate-pulse" />)}
          </div>
        ) : kasbon.length === 0 ? (
          <p className="text-center py-8 text-on-surface-variant text-sm">Tidak ada kasbon.</p>
        ) : (
          <div className="space-y-3">
            {kasbon.map((k) => (
              <div key={k.id} className="border border-surface-high rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-body font-semibold text-on-surface">
                      {k.karyawan?.nama ?? '—'} <span className="text-on-surface-variant font-normal text-xs">({k.karyawan?.divisi})</span>
                    </p>
                    <p className="font-display font-bold text-primary text-lg">{rupiah(k.nominal)}</p>
                    <p className="text-sm text-on-surface-variant">{k.alasan}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_BADGE[k.status] ?? 'bg-gray-100'}`}>
                    {k.status}
                  </span>
                </div>

                {k.cicilan && (
                  <p className="text-xs text-on-surface-variant mb-2">
                    Cicilan: {rupiah(k.cicilan.nominal_cicilan)} × {k.cicilan.jumlah_cicil} kali
                    ({k.cicilan.cicil_terbayar}/{k.cicilan.jumlah_cicil} terbayar)
                  </p>
                )}

                {k.status === 'PENDING' && (
                  <div className="mt-2">
                    {approving === k.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-on-surface-variant block mb-0.5">Nominal/cicil</label>
                            <input type="number" min="1" value={approveForm.nominal_cicilan}
                              onChange={(e) => setApproveForm(f => ({...f, nominal_cicilan: e.target.value}))}
                              className="input-field text-sm" placeholder="100000" />
                          </div>
                          <div>
                            <label className="text-xs text-on-surface-variant block mb-0.5">Jumlah cicil</label>
                            <input type="number" min="1" value={approveForm.jumlah_cicil}
                              onChange={(e) => setApproveForm(f => ({...f, jumlah_cicil: e.target.value}))}
                              className="input-field text-sm" placeholder="5" />
                          </div>
                          <div>
                            <label className="text-xs text-on-surface-variant block mb-0.5">Mulai</label>
                            <input type="date" value={approveForm.tgl_mulai}
                              onChange={(e) => setApproveForm(f => ({...f, tgl_mulai: e.target.value}))}
                              className="input-field text-sm" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleApprove(k.id)} loading={approveSaving} className="flex-1">
                            Konfirmasi Approve
                          </Button>
                          <Button variant="ghost" onClick={() => setApproving(null)} className="flex-1">
                            Batal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button onClick={() => setApproving(k.id)} className="flex-1">Approve</Button>
                        <Button variant="ghost" onClick={() => handleReject(k.id)} className="flex-1">Tolak</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/sdm/kasbon/page.tsx`.

- [ ] **Step 2: Update upah page to show potongan_kasbon + upah_bersih**

In `frontend/app/(dashboard)/admin/sdm/upah/page.tsx`:

**Update `UpahRow` interface** — add 2 fields:
```tsx
interface UpahRow {
  karyawan_id:     number
  nama:            string
  divisi:          string
  hari_hadir:      number
  tarif_harian:    number
  total_upah:      number
  potongan_kasbon: number
  upah_bersih:     number
}
```

**Update table headers** — add 2 columns after 'Total Upah':
```tsx
{['Nama', 'Divisi', 'Hari Hadir', 'Tarif Harian', 'Total Upah', 'Potongan Kasbon', 'Upah Bersih'].map((h) => (...))}
```

**Update table rows** — add 2 cells:
```tsx
<td className="py-3 px-4 font-display text-right text-error whitespace-nowrap">
  {r.potongan_kasbon > 0 ? rupiah(r.potongan_kasbon) : '—'}
</td>
<td className="py-3 px-4 font-display font-semibold text-right text-primary whitespace-nowrap">
  {rupiah(r.upah_bersih)}
</td>
```

**Update total row** — use `upah_bersih` total:
```tsx
const totalUpah = rows.reduce((sum, r) => sum + r.upah_bersih, 0)
```

Also update `colSpan` on the total row from `4` to `6` (since we added 2 columns).

- [ ] **Step 3: Update Sidebar**

In `frontend/components/shared/Sidebar.tsx`, add `CreditCard` to lucide-react import (after `Calculator`):
```tsx
  ..., Calculator, Activity, LineChart, CreditCard
```

Add nav item AFTER `/admin/sdm/upah`:
```tsx
  { href: '/admin/sdm/upah', label: 'Upah Harian',   icon: Calculator,  roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA'] },
  { href: '/sdm/kasbon',     label: 'Kasbon',          icon: CreditCard,  roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA'] },
```

- [ ] **Step 4: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. Fix any (common: interface fields, colSpan type).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/sdm/kasbon/page.tsx" \
        "frontend/app/(dashboard)/admin/sdm/upah/page.tsx" \
        frontend/components/shared/Sidebar.tsx
git commit -m "feat(kasbon): add kasbon page, extend upah report with potongan kasbon, sidebar"
```

---

## Task 5: Verification + Close T-25

**Files:**
- Modify: `docs/tasks/T-25-kasbon-karyawan.md`
- Modify: `docs/TASKS.md`

- [ ] **Step 1: Run Sdm tests (KasbonTest + SdmTest)**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Sdm/ --no-coverage 2>&1 | tail -15
```

Expected: all tests in Sdm/ pass (SdmTest: 9 + KasbonTest: 11 = 20 tests).

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

- [ ] **Step 4: Update T-25 task doc**

In `docs/tasks/T-25-kasbon-karyawan.md`:
- `**Status:** \`TODO\`` → `**Status:** \`DONE\``
- All `- [ ]` → `- [x]`
- Add to Notes: "RealisasiCicilan model skipped for MVP — cicil_terbayar counter on cicilan_kasbon tracks progress. Potongan kasbon shown in upah report but actual deduction recording (incrementing cicil_terbayar) is manual (deferred). End-of-musim debt carryover deferred."

- [ ] **Step 5: Update TASKS.md**

- T-25 row: `⬜ TODO` → `✅ DONE`
- Phase 3 progress: `4 / 7` → `5 / 7`
- Summary: Phase 3 Selesai `4→5`, Sisa `3→2`; TOTAL Selesai `22→23`, Sisa `3→2`

- [ ] **Step 6: Commit + tag**

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-25-kasbon-karyawan.md docs/TASKS.md
git commit -m "docs: mark T-25 Kasbon Karyawan as DONE"
git tag t-25-complete
```

---

## Acceptance Criteria Checklist

- [ ] Submit kasbon (PENDING), approve (APPROVED + cicilan), reject (REJECTED)
- [ ] List kasbon scoped to depot, filterable by status
- [ ] Approve creates CicilanKasbon with nominal_cicilan + jumlah_cicil
- [ ] Upah report includes potongan_kasbon + upah_bersih per karyawan
- [ ] Active cicilan (cicil_terbayar < jumlah_cicil) deducted from upah
- [ ] /sdm/kasbon page with tabs + approve/reject actions
- [ ] All Sdm tests pass (SdmTest + KasbonTest)
- [ ] Full suite passes
- [ ] TypeScript clean
