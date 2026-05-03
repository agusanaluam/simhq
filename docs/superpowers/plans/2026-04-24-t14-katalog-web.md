# T-14 Katalog Web Publik & Form Order Online Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public catalog page showing available hewan by kelas/jenis with order form; CS dashboard to manage incoming orders.

**Architecture:** New `order_katalog` table stores public form submissions. Two controllers: `KatalogController` (public, no auth — GET catalog + POST order) registered outside `auth:sanctum`; `CsOrderController` (authenticated, CS role) inside `auth:sanctum`. Catalog data derived from `hewan.status=AVAILABLE` count — no separate SlotPesanan table. `/katalog` is already excluded from Next.js auth middleware. Catalog page is a Next.js Server Component (SSR/SEO) that fetches data server-side; interactive order form is a Client Component child. CS order page is inside `(dashboard)` with Sidebar. Photo integration (T-15) and WAHA notification (T-17) are deferred.

**Tech Stack:** Laravel 11, Next.js 14 App Router (Server Component + Client Component), TypeScript, PHPUnit TDD

---

## File Map

### Backend — Create
```
backend/
  database/migrations/2026_04_24_200000_create_order_katalog_table.php
  app/Models/OrderKatalog.php
  app/Http/Controllers/KatalogController.php
  app/Http/Controllers/CsOrderController.php
  tests/Feature/Katalog/KatalogTest.php
  tests/Feature/Katalog/CsOrderTest.php
```

### Backend — Modify
```
backend/routes/api.php
```

### Frontend — Create
```
frontend/app/katalog/
  page.tsx                          (Server Component — SSR)
  components/
    KatalogContent.tsx              (Client Component — order form state)
    HewanCard.tsx
    OrderModal.tsx
frontend/app/(dashboard)/cs/order/
  page.tsx
  components/
    OrderTable.tsx
```

### Frontend — Modify
```
frontend/components/shared/Sidebar.tsx  (add Inbox + /cs/order nav item)
```

---

## Task 1: Migration + Model

**Files:**
- Create: `backend/database/migrations/2026_04_24_200000_create_order_katalog_table.php`
- Create: `backend/app/Models/OrderKatalog.php`

- [ ] **Step 1: Create migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_katalog', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->string('nama', 150);
            $table->string('hp', 20);
            $table->text('alamat')->nullable();
            $table->enum('jenis', ['SAPI', 'DOMBA']);
            $table->string('kelas', 50);
            $table->enum('tipe_qurban', ['SHQ', 'THQ', 'PHQ']);
            $table->text('catatan')->nullable();
            $table->enum('status', ['BARU', 'DIKONFIRMASI', 'DP_DIBAYAR', 'LUNAS', 'DIJADWALKAN', 'DIBATALKAN'])
                  ->default('BARU');
            $table->foreignId('cs_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_katalog');
    }
};
```

Save to `backend/database/migrations/2026_04_24_200000_create_order_katalog_table.php`.

- [ ] **Step 2: Create OrderKatalog model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderKatalog extends Model
{
    protected $table = 'order_katalog';

    protected $fillable = [
        'depot_id', 'nama', 'hp', 'alamat',
        'jenis', 'kelas', 'tipe_qurban', 'catatan', 'status', 'cs_id',
    ];

    public function depot(): BelongsTo { return $this->belongsTo(Depot::class); }
    public function cs(): BelongsTo    { return $this->belongsTo(User::class, 'cs_id'); }
}
```

Save to `backend/app/Models/OrderKatalog.php`.

- [ ] **Step 3: Run migration**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan migrate
```

Expected: `Migrating: 2026_04_24_200000_create_order_katalog_table` → `Migrated`.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/2026_04_24_200000_create_order_katalog_table.php \
        backend/app/Models/OrderKatalog.php
git commit -m "feat(katalog): add order_katalog migration and OrderKatalog model"
```

---

## Task 2: Write Failing Tests (TDD)

**Files:**
- Create: `backend/tests/Feature/Katalog/KatalogTest.php`
- Create: `backend/tests/Feature/Katalog/CsOrderTest.php`

- [ ] **Step 1: Write KatalogTest**

```php
<?php

namespace Tests\Feature\Katalog;

use App\Models\Depot;
use App\Models\HargaKelas;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\OrderKatalog;
use App\Models\Supplier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KatalogTest extends TestCase
{
    use RefreshDatabase;

    private Depot      $depot;
    private KelasHewan $kelas;
    private Supplier   $supplier;
    private int        $musim;
    private int        $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot    = Depot::factory()->create();
        $this->kelas    = KelasHewan::create(['kode' => 'A', 'nama' => 'Kelas A', 'urutan' => 1]);
        $this->supplier = Supplier::create(['nama' => 'Supplier Test', 'is_gum' => false, 'is_active' => true]);
        $this->musim    = (int) date('Y');

        HargaKelas::create([
            'depot_id'   => $this->depot->id,
            'kelas_id'   => $this->kelas->id,
            'jenis'      => 'SAPI',
            'musim'      => $this->musim,
            'harga_beli' => 8_000_000,
            'harga_jual' => 10_000_000,
        ]);
    }

    private function makeHewan(string $status = 'AVAILABLE'): Hewan
    {
        $this->seq++;
        return Hewan::create([
            'depot_id'      => $this->depot->id,
            'supplier_id'   => $this->supplier->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'no_hewan'      => str_pad($this->seq, 3, '0', STR_PAD_LEFT),
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300.00,
            'tgl_masuk'     => today()->toDateString(),
            'musim'         => $this->musim,
            'status'        => $status,
        ]);
    }

    // ─── catalog ─────────────────────────────────────────────────────────────

    public function test_catalog_returns_available_hewan_grouped(): void
    {
        $this->makeHewan('AVAILABLE');
        $this->makeHewan('AVAILABLE');

        $res = $this->getJson("/api/katalog?depot={$this->depot->id}");

        $res->assertOk()
            ->assertJsonStructure([
                'musim',
                'data' => [['kelas', 'jenis', 'harga_jual', 'jumlah_tersedia']],
            ]);

        $row = collect($res->json('data'))->firstWhere('jenis', 'SAPI');
        $this->assertEquals(2,          $row['jumlah_tersedia']);
        $this->assertEquals(10_000_000, $row['harga_jual']);
    }

    public function test_catalog_excludes_non_available_hewan(): void
    {
        $this->makeHewan('AVAILABLE');
        $this->makeHewan('SOLD');
        $this->makeHewan('BOOKED');

        $res = $this->getJson("/api/katalog?depot={$this->depot->id}");

        $row = collect($res->json('data'))->firstWhere('jenis', 'SAPI');
        $this->assertEquals(1, $row['jumlah_tersedia']); // only AVAILABLE
    }

    public function test_catalog_scoped_to_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        $this->makeHewan('AVAILABLE');
        Hewan::create([
            'depot_id' => $otherDepot->id, 'supplier_id' => $this->supplier->id,
            'kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id,
            'no_hewan' => '999', 'jenis' => 'SAPI', 'bobot_masuk' => 300,
            'tgl_masuk' => today()->toDateString(), 'musim' => $this->musim, 'status' => 'AVAILABLE',
        ]);

        $res = $this->getJson("/api/katalog?depot={$this->depot->id}");

        $row = collect($res->json('data'))->firstWhere('jenis', 'SAPI');
        $this->assertEquals(1, $row['jumlah_tersedia']);
    }

    public function test_catalog_requires_depot_param(): void
    {
        $this->getJson('/api/katalog')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['depot']);
    }

    // ─── order ───────────────────────────────────────────────────────────────

    public function test_order_can_be_submitted(): void
    {
        $res = $this->postJson('/api/katalog/order', [
            'depot_id'    => $this->depot->id,
            'nama'        => 'Ahmad Fauzi',
            'hp'          => '081234567890',
            'jenis'       => 'SAPI',
            'kelas'       => 'Kelas A',
            'tipe_qurban' => 'SHQ',
        ]);

        $res->assertCreated()->assertJsonPath('order.nama', 'Ahmad Fauzi');
        $this->assertDatabaseHas('order_katalog', ['nama' => 'Ahmad Fauzi', 'status' => 'BARU']);
    }

    public function test_order_validates_required_fields(): void
    {
        $this->postJson('/api/katalog/order', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['depot_id', 'nama', 'hp', 'jenis', 'kelas', 'tipe_qurban']);
    }

    public function test_order_rejects_invalid_tipe_qurban(): void
    {
        $this->postJson('/api/katalog/order', [
            'depot_id'    => $this->depot->id,
            'nama'        => 'Test',
            'hp'          => '081234567890',
            'jenis'       => 'SAPI',
            'kelas'       => 'Kelas A',
            'tipe_qurban' => 'INVALID',
        ])->assertUnprocessable()->assertJsonValidationErrors(['tipe_qurban']);
    }
}
```

Save to `backend/tests/Feature/Katalog/KatalogTest.php`.

- [ ] **Step 2: Write CsOrderTest**

```php
<?php

namespace Tests\Feature\Katalog;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\OrderKatalog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CsOrderTest extends TestCase
{
    use RefreshDatabase;

    private User  $cs;
    private Depot $depot;
    private int   $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot = Depot::factory()->create();
        $this->cs    = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::CS_KETUA,
        ]);
    }

    private function makeOrder(array $attrs = []): OrderKatalog
    {
        $this->seq++;
        return OrderKatalog::create(array_merge([
            'depot_id'    => $this->depot->id,
            'nama'        => "Pembeli {$this->seq}",
            'hp'          => '08123456789' . $this->seq,
            'jenis'       => 'SAPI',
            'kelas'       => 'Kelas A',
            'tipe_qurban' => 'SHQ',
            'status'      => 'BARU',
        ], $attrs));
    }

    // ─── index ───────────────────────────────────────────────────────────────

    public function test_cs_can_list_orders(): void
    {
        $this->makeOrder();
        $this->makeOrder();

        $res = $this->actingAs($this->cs)->getJson('/api/cs/order');

        $res->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'data' => [['id', 'nama', 'hp', 'jenis', 'kelas', 'tipe_qurban', 'status']],
                    'total', 'per_page', 'current_page',
                ],
            ]);
        $this->assertCount(2, $res->json('data.data'));
    }

    public function test_orders_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        $this->makeOrder();
        OrderKatalog::create([
            'depot_id' => $otherDepot->id, 'nama' => 'Other',
            'hp' => '081111', 'jenis' => 'SAPI', 'kelas' => 'A',
            'tipe_qurban' => 'SHQ', 'status' => 'BARU',
        ]);

        $res = $this->actingAs($this->cs)->getJson('/api/cs/order');

        $this->assertCount(1, $res->json('data.data'));
    }

    public function test_orders_filterable_by_status(): void
    {
        $this->makeOrder(['status' => 'BARU']);
        $this->makeOrder(['status' => 'DIKONFIRMASI']);

        $res = $this->actingAs($this->cs)->getJson('/api/cs/order?status=BARU');

        $this->assertCount(1, $res->json('data.data'));
        $this->assertEquals('BARU', $res->json('data.data.0.status'));
    }

    // ─── update status ────────────────────────────────────────────────────────

    public function test_cs_can_update_order_status(): void
    {
        $order = $this->makeOrder(['status' => 'BARU']);

        $res = $this->actingAs($this->cs)
            ->putJson("/api/cs/order/{$order->id}/status", ['status' => 'DIKONFIRMASI']);

        $res->assertOk()->assertJsonPath('order.status', 'DIKONFIRMASI');
        $this->assertDatabaseHas('order_katalog', ['id' => $order->id, 'status' => 'DIKONFIRMASI']);
    }

    public function test_cannot_update_status_of_other_depots_order(): void
    {
        $otherDepot = Depot::factory()->create();
        $otherOrder = OrderKatalog::create([
            'depot_id' => $otherDepot->id, 'nama' => 'Other',
            'hp' => '081111', 'jenis' => 'SAPI', 'kelas' => 'A',
            'tipe_qurban' => 'SHQ', 'status' => 'BARU',
        ]);

        $this->actingAs($this->cs)
            ->putJson("/api/cs/order/{$otherOrder->id}/status", ['status' => 'DIKONFIRMASI'])
            ->assertForbidden();
    }

    public function test_update_status_validates_valid_values(): void
    {
        $order = $this->makeOrder();

        $this->actingAs($this->cs)
            ->putJson("/api/cs/order/{$order->id}/status", ['status' => 'INVALID'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_cs_endpoints(): void
    {
        $this->getJson('/api/cs/order')->assertUnauthorized();
    }
}
```

Save to `backend/tests/Feature/Katalog/CsOrderTest.php`.

- [ ] **Step 3: Run tests — expect failures**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Katalog/ --no-coverage 2>&1 | tail -10
```

Expected: all tests FAIL with 404.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/tests/Feature/Katalog/
git commit -m "test(katalog): add failing KatalogTest and CsOrderTest (TDD)"
```

---

## Task 3: KatalogController + CsOrderController + Routes

**Files:**
- Create: `backend/app/Http/Controllers/KatalogController.php`
- Create: `backend/app/Http/Controllers/CsOrderController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write KatalogController**

```php
<?php

namespace App\Http\Controllers;

use App\Models\OrderKatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KatalogController extends Controller
{
    public function catalog(Request $request): JsonResponse
    {
        $request->validate(['depot' => ['required', 'integer', 'exists:depots,id']]);

        $depotId = (int) $request->input('depot');
        $musim   = (int) date('Y');

        $items = DB::table('hewan as h')
            ->join('kelas_hewan as kj', 'kj.id', '=', 'h.kelas_jual_id')
            ->leftJoin('harga_kelas as hk', function ($join) {
                $join->on('hk.kelas_id', '=', 'h.kelas_jual_id')
                     ->on('hk.jenis', '=', 'h.jenis')
                     ->on('hk.musim', '=', 'h.musim')
                     ->on('hk.depot_id', '=', 'h.depot_id');
            })
            ->where('h.depot_id', $depotId)
            ->where('h.musim', $musim)
            ->where('h.status', 'AVAILABLE')
            ->groupBy('kj.id', 'kj.nama', 'h.jenis', 'hk.harga_jual')
            ->orderBy('kj.nama')
            ->orderBy('h.jenis')
            ->select(
                'kj.nama as kelas',
                'h.jenis',
                DB::raw('COALESCE(hk.harga_jual, 0) as harga_jual'),
                DB::raw('COUNT(h.id) as jumlah_tersedia'),
            )
            ->get()
            ->map(fn($r) => [
                'kelas'           => $r->kelas,
                'jenis'           => $r->jenis,
                'harga_jual'      => (int) $r->harga_jual,
                'jumlah_tersedia' => (int) $r->jumlah_tersedia,
            ]);

        return response()->json(['musim' => $musim, 'data' => $items->values()->all()]);
    }

    public function order(Request $request): JsonResponse
    {
        $data = $request->validate([
            'depot_id'    => ['required', 'integer', 'exists:depots,id'],
            'nama'        => ['required', 'string', 'max:150'],
            'hp'          => ['required', 'string', 'max:20'],
            'alamat'      => ['nullable', 'string'],
            'jenis'       => ['required', 'in:SAPI,DOMBA'],
            'kelas'       => ['required', 'string', 'max:50'],
            'tipe_qurban' => ['required', 'in:SHQ,THQ,PHQ'],
            'catatan'     => ['nullable', 'string'],
        ]);

        $order = OrderKatalog::create(array_merge($data, ['status' => 'BARU']));

        return response()->json(['order' => $order], 201);
    }
}
```

Save to `backend/app/Http/Controllers/KatalogController.php`.

- [ ] **Step 2: Write CsOrderController**

```php
<?php

namespace App\Http\Controllers;

use App\Models\OrderKatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CsOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $query = OrderKatalog::where('depot_id', $depotId)
            ->with('cs:id,name')
            ->orderBy('created_at', 'desc');

        if ($request->status) {
            $query->where('status', $request->status);
        }

        return response()->json(['data' => $query->paginate(50)]);
    }

    public function updateStatus(Request $request, OrderKatalog $order): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        abort_unless((int) $order->depot_id === (int) $depotId, 403);

        $data = $request->validate([
            'status' => ['required', 'in:BARU,DIKONFIRMASI,DP_DIBAYAR,LUNAS,DIJADWALKAN,DIBATALKAN'],
        ]);

        $order->update($data);

        return response()->json(['order' => $order]);
    }
}
```

Save to `backend/app/Http/Controllers/CsOrderController.php`.

- [ ] **Step 3: Register routes in `backend/routes/api.php`**

Add public catalog routes BEFORE the `auth:sanctum` middleware group (right after the public `auth/login` routes):

```php
// Public Catalog (no auth)
Route::get('katalog',        [\App\Http\Controllers\KatalogController::class, 'catalog']);
Route::post('katalog/order', [\App\Http\Controllers\KatalogController::class, 'order']);
```

Add CS order routes INSIDE the `auth:sanctum` group (after the laporan section):

```php
// CS Order Management
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,CS_KETUA,CS_ANGGOTA,ADMIN_KETUA')->group(function () {
    Route::get('cs/order',                    [\App\Http\Controllers\CsOrderController::class, 'index']);
    Route::put('cs/order/{order}/status',      [\App\Http\Controllers\CsOrderController::class, 'updateStatus']);
});
```

- [ ] **Step 4: Run tests — expect all green**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Katalog/ --no-coverage 2>&1 | tail -15
```

Expected: all 14 tests PASS (7 KatalogTest + 7 CsOrderTest). Fix any failures before continuing.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/KatalogController.php \
        backend/app/Http/Controllers/CsOrderController.php \
        backend/routes/api.php
git commit -m "feat(katalog): add KatalogController, CsOrderController, and routes"
```

---

## Task 4: Frontend — HewanCard + OrderModal Components

**Files:**
- Create: `frontend/app/katalog/components/HewanCard.tsx`
- Create: `frontend/app/katalog/components/OrderModal.tsx`

- [ ] **Step 1: Write HewanCard**

```tsx
interface HewanCardProps {
  kelas:          string
  jenis:          string
  harga_jual:     number
  jumlah_tersedia: number
  onOrder:        () => void
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

export function HewanCard({ kelas, jenis, harga_jual, jumlah_tersedia, onOrder }: HewanCardProps) {
  const habis = jumlah_tersedia === 0

  return (
    <div className={`rounded-xl border bg-white shadow-sm p-5 flex flex-col gap-3 ${habis ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-lg text-gray-900">{kelas}</p>
          <p className="text-sm text-gray-500">{jenis}</p>
        </div>
        {habis ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">HABIS</span>
        ) : (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
            {jumlah_tersedia} tersedia
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{rupiah(harga_jual)}</p>
      <button
        onClick={onOrder}
        disabled={habis}
        className={`mt-auto w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          habis
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {habis ? 'Stok Habis' : 'Pesan Sekarang'}
      </button>
    </div>
  )
}
```

Save to `frontend/app/katalog/components/HewanCard.tsx`.

- [ ] **Step 2: Write OrderModal**

```tsx
'use client'

import { useState } from 'react'

interface OrderModalProps {
  depotId:    number
  kelasList:  string[]
  onClose:    () => void
  onSuccess:  () => void
  initialKelas?: string
  initialJenis?: string
}

const JENIS_OPTIONS    = ['SAPI', 'DOMBA']
const TIPE_OPTIONS     = ['SHQ', 'THQ', 'PHQ']
const API_URL          = process.env.NEXT_PUBLIC_API_URL ?? ''

export function OrderModal({ depotId, kelasList, onClose, onSuccess, initialKelas = '', initialJenis = 'SAPI' }: OrderModalProps) {
  const [form, setForm] = useState({
    nama:        '',
    hp:          '',
    alamat:      '',
    jenis:       initialJenis,
    kelas:       initialKelas || kelasList[0] || '',
    tipe_qurban: 'SHQ',
    catatan:     '',
  })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nama || !form.hp) { setError('Nama dan no. HP wajib diisi.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/katalog/order`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ depot_id: depotId, ...form }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data?.message ?? 'Gagal mengirim order.')
        return
      }
      onSuccess()
    } catch {
      setError('Gagal mengirim order. Cek koneksi internet.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Form Pemesanan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelClass}>Nama Lengkap *</label>
            <input className={inputClass} value={form.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Ahmad Fauzi" required />
          </div>
          <div>
            <label className={labelClass}>No. HP / WhatsApp *</label>
            <input className={inputClass} value={form.hp} onChange={(e) => set('hp', e.target.value)} placeholder="08123456789" required />
          </div>
          <div>
            <label className={labelClass}>Alamat</label>
            <textarea className={`${inputClass} h-20 resize-none`} value={form.alamat} onChange={(e) => set('alamat', e.target.value)} placeholder="Alamat lengkap (opsional)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Jenis</label>
              <select className={inputClass} value={form.jenis} onChange={(e) => set('jenis', e.target.value)}>
                {JENIS_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Kelas</label>
              <select className={inputClass} value={form.kelas} onChange={(e) => set('kelas', e.target.value)}>
                {kelasList.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Tipe Qurban</label>
            <div className="flex gap-2">
              {TIPE_OPTIONS.map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => set('tipe_qurban', t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.tipe_qurban === t
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Catatan (opsional)</label>
            <textarea className={`${inputClass} h-16 resize-none`} value={form.catatan} onChange={(e) => set('catatan', e.target.value)} placeholder="Mis. minta ukuran tertentu, jadwal terima, dll." />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit" disabled={saving}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
          >
            {saving ? 'Mengirim...' : 'Kirim Pesanan'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

Save to `frontend/app/katalog/components/OrderModal.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/katalog/components/"
git commit -m "feat(katalog): add HewanCard and OrderModal components"
```

---

## Task 5: Frontend — Public Catalog Page

**Files:**
- Create: `frontend/app/katalog/page.tsx` (Server Component)
- Create: `frontend/app/katalog/components/KatalogContent.tsx` (Client Component)

- [ ] **Step 1: Write KatalogContent (Client Component)**

```tsx
'use client'

import { useState } from 'react'
import { HewanCard } from './HewanCard'
import { OrderModal } from './OrderModal'

interface CatalogItem {
  kelas:            string
  jenis:            string
  harga_jual:       number
  jumlah_tersedia:  number
}

interface KatalogContentProps {
  items:   CatalogItem[]
  depotId: number
  musim:   number
}

export function KatalogContent({ items, depotId, musim }: KatalogContentProps) {
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)
  const [submitted,    setSubmitted]    = useState(false)

  const kelasList = [...new Set(items.map((i) => i.kelas))]

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pesanan Diterima!</h2>
        <p className="text-gray-600 max-w-sm">
          Tim CS kami akan menghubungi Anda dalam 1×24 jam via WhatsApp untuk konfirmasi dan informasi pembayaran.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-6 px-6 py-2.5 border border-green-600 text-green-600 rounded-xl font-medium hover:bg-green-50"
        >
          Pesan Lagi
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg">Belum ada hewan tersedia untuk musim {musim}.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((item, i) => (
          <HewanCard
            key={i}
            kelas={item.kelas}
            jenis={item.jenis}
            harga_jual={item.harga_jual}
            jumlah_tersedia={item.jumlah_tersedia}
            onOrder={() => setSelectedItem(item)}
          />
        ))}
      </div>

      {selectedItem && (
        <OrderModal
          depotId={depotId}
          kelasList={kelasList}
          initialKelas={selectedItem.kelas}
          initialJenis={selectedItem.jenis}
          onClose={() => setSelectedItem(null)}
          onSuccess={() => { setSelectedItem(null); setSubmitted(true) }}
        />
      )}
    </>
  )
}
```

Save to `frontend/app/katalog/components/KatalogContent.tsx`.

- [ ] **Step 2: Write catalog page (Server Component)**

```tsx
import { KatalogContent } from './components/KatalogContent'

interface PageProps {
  searchParams: Promise<{ depot?: string }>
}

async function getCatalog(depotId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/katalog?depot=${depotId}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return { data: [], musim: new Date().getFullYear() }
    return res.json()
  } catch {
    return { data: [], musim: new Date().getFullYear() }
  }
}

export default async function KatalogPage({ searchParams }: PageProps) {
  const params  = await searchParams
  const depotId = params.depot ?? ''

  if (!depotId || isNaN(Number(depotId))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Link katalog tidak valid. Silakan gunakan link yang benar.</p>
        </div>
      </div>
    )
  }

  const catalog = await getCatalog(depotId)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <h1 className="text-2xl font-bold text-gray-900">Katalog Hewan Qurban</h1>
          <p className="text-sm text-gray-500 mt-1">Musim {catalog.musim} — Tersedia sekarang</p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <KatalogContent
          items={catalog.data}
          depotId={Number(depotId)}
          musim={catalog.musim}
        />
      </main>
      <footer className="text-center py-8 text-xs text-gray-400">
        © {new Date().getFullYear()} SIM Hewan Qurban
      </footer>
    </div>
  )
}
```

Save to `frontend/app/katalog/page.tsx`.

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output. Fix any errors before committing.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/katalog/"
git commit -m "feat(katalog): add public catalog page (SSR) with HewanCard + OrderModal"
```

---

## Task 6: Frontend — CS Order Dashboard + Sidebar

**Files:**
- Create: `frontend/app/(dashboard)/cs/order/components/OrderTable.tsx`
- Create: `frontend/app/(dashboard)/cs/order/page.tsx`
- Modify: `frontend/components/shared/Sidebar.tsx`

- [ ] **Step 1: Write OrderTable**

```tsx
import { Card } from '@/components/ui/Card'

interface OrderRow {
  id:           number
  nama:         string
  hp:           string
  jenis:        string
  kelas:        string
  tipe_qurban:  string
  status:       string
  created_at:   string
  cs:           { id: number; name: string } | null
}

interface OrderTableProps {
  orders:         OrderRow[]
  onStatusChange: (id: number, status: string) => void
}

const STATUS_OPTIONS = ['BARU', 'DIKONFIRMASI', 'DP_DIBAYAR', 'LUNAS', 'DIJADWALKAN', 'DIBATALKAN']

const STATUS_BADGE: Record<string, string> = {
  BARU:         'bg-blue-100 text-blue-700',
  DIKONFIRMASI: 'bg-yellow-100 text-yellow-700',
  DP_DIBAYAR:   'bg-purple-100 text-purple-700',
  LUNAS:        'bg-green-100 text-green-700',
  DIJADWALKAN:  'bg-teal-100 text-teal-700',
  DIBATALKAN:   'bg-red-100 text-red-700',
}

export function OrderTable({ orders, onStatusChange }: OrderTableProps) {
  if (orders.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant text-center py-8">Belum ada order masuk.</p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-high">
              {['Waktu', 'Nama', 'HP', 'Pesanan', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                <td className="py-3 px-4 font-body text-on-surface-variant whitespace-nowrap text-xs">
                  {new Date(o.created_at).toLocaleDateString('id-ID')}
                </td>
                <td className="py-3 px-4 font-body font-medium text-on-surface">{o.nama}</td>
                <td className="py-3 px-4 font-body text-on-surface-variant">
                  <a
                    href={`https://wa.me/62${o.hp.replace(/^0/, '')}?text=${encodeURIComponent(`Halo ${o.nama}, kami dari Tim Qurban. Terima kasih sudah memesan ${o.kelas} ${o.jenis} (${o.tipe_qurban}).`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline"
                  >
                    {o.hp}
                  </a>
                </td>
                <td className="py-3 px-4 font-body text-on-surface">
                  {o.kelas} {o.jenis} ({o.tipe_qurban})
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_BADGE[o.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {o.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <select
                    value={o.status}
                    onChange={(e) => onStatusChange(o.id, e.target.value)}
                    className="text-xs border border-surface-high rounded-md px-2 py-1 bg-white"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
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

Save to `frontend/app/(dashboard)/cs/order/components/OrderTable.tsx`.

- [ ] **Step 2: Write CS order page**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { OrderTable } from './components/OrderTable'
import api from '@/lib/api'

interface OrderRow {
  id:          number
  nama:        string
  hp:          string
  jenis:       string
  kelas:       string
  tipe_qurban: string
  status:      string
  created_at:  string
  cs:          { id: number; name: string } | null
}

const STATUS_FILTER = ['', 'BARU', 'DIKONFIRMASI', 'DP_DIBAYAR', 'LUNAS', 'DIJADWALKAN', 'DIBATALKAN']

export default function CsOrderPage() {
  const [orders,  setOrders]  = useState<OrderRow[]>([])
  const [status,  setStatus]  = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = status ? `?status=${status}` : ''
      const res = await api.get(`/api/cs/order${params}`)
      setOrders(res.data.data?.data ?? [])
    } catch {
      setError('Gagal memuat order.')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleStatusChange(id: number, newStatus: string) {
    try {
      await api.put(`/api/cs/order/${id}/status`, { status: newStatus })
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus } : o))
    } catch {
      alert('Gagal mengubah status.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Antrian Order Katalog</h1>
          <p className="text-sm text-on-surface-variant mt-1">Order masuk dari katalog web publik</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field text-sm"
          >
            {STATUS_FILTER.map((s) => (
              <option key={s} value={s}>{s || '— Semua —'}</option>
            ))}
          </select>
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
        <OrderTable orders={orders} onStatusChange={handleStatusChange} />
      )}
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/cs/order/page.tsx`.

- [ ] **Step 3: Update Sidebar**

In `frontend/components/shared/Sidebar.tsx`, add `Inbox` to lucide-react import and a new nav item after the Income Statement entry.

Current import ends with `TrendingUp`. Change to:
```tsx
  Wallet, Truck, ClipboardList, ClipboardCheck, LogOut, Database, PawPrint, Grid3x3, Receipt, Layers, BarChart2, HandCoins, BookOpen, TrendingUp, Inbox
```

Add nav item after `/laporan/income-statement`:
```tsx
  { href: '/laporan/income-statement', label: 'Income Statement', icon: TrendingUp, roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
  { href: '/cs/order',                 label: 'Order Katalog',    icon: Inbox,      roles: ['SUPER_ADMIN','KEPALA_DEPOT','CS_KETUA','CS_ANGGOTA','ADMIN_KETUA'] },
```

- [ ] **Step 4: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output. Fix any errors before committing.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/cs/order/" frontend/components/shared/Sidebar.tsx
git commit -m "feat(katalog): add CS order dashboard + sidebar link"
```

---

## Task 7: Verification + Close T-14

**Files:**
- Modify: `docs/tasks/T-14-katalog-web.md`
- Modify: `docs/TASKS.md`

- [ ] **Step 1: Run all backend tests**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Katalog/ --no-coverage 2>&1 | tail -15
```

Expected: all 14 tests PASS.

- [ ] **Step 2: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -5
```

Expected: no output.

- [ ] **Step 3: Smoke test checklist**

With backend on :8000 and frontend on :3000:

- [ ] `/katalog?depot=1` loads without login (public)
- [ ] HewanCard shows kelas, jenis, harga, jumlah_tersedia
- [ ] "HABIS" badge shows when jumlah_tersedia=0
- [ ] "Pesan Sekarang" opens OrderModal
- [ ] Submit form → confirmation page "Pesanan Diterima"
- [ ] `/cs/order` (logged in as CS) shows order table
- [ ] HP number is a clickable WA link
- [ ] Status dropdown updates order status inline
- [ ] Sidebar shows "Order Katalog" link for CS roles

- [ ] **Step 4: Update T-14 task doc**

In `docs/tasks/T-14-katalog-web.md`:
- `**Status:** \`TODO\`` → `**Status:** \`DONE\``
- All `- [ ]` in Acceptance Criteria → `- [x]`
- All `- [ ]` in Technical Tasks → `- [x]`
- Add to Notes: "Photo integration deferred to T-15. WAHA automatic notification deferred to T-17. SlotPesanan config table not implemented — slot count derived from hewan.status=AVAILABLE."

- [ ] **Step 5: Update TASKS.md**

- T-14 row: `⬜ TODO` → `✅ DONE`
- Phase 2 progress: `5 / 10` → `6 / 10`
- Summary: Phase 2 Selesai `5→6`, Sisa `5→4`; TOTAL Selesai `13→14`, Sisa `12→11`

- [ ] **Step 6: Commit + tag**

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-14-katalog-web.md docs/TASKS.md
git commit -m "docs: mark T-14 Katalog Web as DONE"
git tag t-14-complete
```

---

## Acceptance Criteria Checklist

- [ ] Halaman publik `/katalog?depot=` tanpa login ✅ (middleware already excludes /katalog)
- [ ] HewanCard: kelas, jenis, harga_jual, jumlah_tersedia, tombol Pesan
- [ ] Badge "HABIS" jika jumlah_tersedia = 0
- [ ] Form order: nama, hp, alamat, jenis, kelas, tipe_qurban (SHQ/THQ/PHQ), catatan
- [ ] Submit → masuk order_katalog table, status=BARU
- [ ] CS lihat antrian order di /cs/order
- [ ] WA link dari nomor HP order
- [ ] Status update per order (dropdown)
- [ ] All 14 backend tests pass
- [ ] TypeScript clean
