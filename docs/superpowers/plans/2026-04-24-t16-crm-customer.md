# T-16 CRM – Customer & Order Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CRM module — customer profile with purchase history, log interaksi, retargeting list, and CS order tracking.

**Architecture:** New `log_interaksi` table for interaction records. `Customer` model augmented with `transaksi()` and `logs()` HasMany relations. `CrmController` exposes CRM-specific list (with search/filter), detail (with full history), update, log-add, and retargeting endpoints at `/api/crm/customer/*`. Retargeting = customers who bought in musim-1 but not musim. OrderKatalog linked to customers by HP match. Frontend: `/cs/customer` list, `/cs/customer/[id]` detail, `/cs/retargeting` — all inside (dashboard) layout. Sidebar adds `UserCheck` + `Target` icons. Log interaksi (WA notification on >80% budget) deferred to T-17.

**Tech Stack:** Laravel 11 (Eloquent, RefreshDatabase), Next.js 14 App Router (Client Component), TypeScript, PHPUnit TDD

---

## File Map

### Backend — Create
```
backend/
  database/migrations/2026_04_24_400000_create_log_interaksi_table.php
  app/Models/LogInteraksi.php
  app/Http/Controllers/CrmController.php
  tests/Feature/Crm/CrmTest.php
```

### Backend — Modify
```
backend/app/Models/Customer.php   (add transaksi() + logs() HasMany)
backend/routes/api.php            (add /crm/customer routes)
```

### Frontend — Create
```
frontend/app/(dashboard)/cs/customer/
  page.tsx
  [id]/page.tsx
frontend/app/(dashboard)/cs/retargeting/page.tsx
```

### Frontend — Modify
```
frontend/components/shared/Sidebar.tsx  (add UserCheck + Target + nav items)
```

---

## Task 1: Migration + LogInteraksi Model + Customer Relations

**Files:**
- Create: `backend/database/migrations/2026_04_24_400000_create_log_interaksi_table.php`
- Create: `backend/app/Models/LogInteraksi.php`
- Modify: `backend/app/Models/Customer.php`

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
        Schema::create('log_interaksi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->date('tanggal');
            $table->enum('channel', ['WA', 'TELEPON', 'EMAIL']);
            $table->text('isi');
            $table->foreignId('cs_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('log_interaksi');
    }
};
```

Save to `backend/database/migrations/2026_04_24_400000_create_log_interaksi_table.php`.

- [ ] **Step 2: Create LogInteraksi model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogInteraksi extends Model
{

    protected $table = 'log_interaksi';

    protected $fillable = ['customer_id', 'tanggal', 'channel', 'isi', 'cs_id'];

    protected $casts = ['tanggal' => 'date'];

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function cs(): BelongsTo      { return $this->belongsTo(User::class, 'cs_id'); }
}
```

Save to `backend/app/Models/LogInteraksi.php`.

- [ ] **Step 3: Add relations to Customer model**

In `backend/app/Models/Customer.php`, add two HasMany relations. The Customer model currently only has `$table` and `$fillable`. Add:

```php
use Illuminate\Database\Eloquent\Relations\HasMany;

// add before class closing brace:
    public function transaksi(): HasMany  { return $this->hasMany(Transaksi::class); }
    public function logs(): HasMany       { return $this->hasMany(LogInteraksi::class); }
```

Also add the `use HasMany;` import if not already present and the class method `orderKatalogByHp()` is not needed — skip OrderKatalog relation since it has no customer_id FK (linked by hp match in controller instead).

Full updated Customer.php:
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{

    protected $table = 'customers';

    protected $fillable = ['nama', 'hp', 'alamat', 'kelurahan', 'kecamatan', 'kota'];

    public function transaksi(): HasMany { return $this->hasMany(Transaksi::class); }
    public function logs(): HasMany      { return $this->hasMany(LogInteraksi::class); }
}
```

- [ ] **Step 4: Run migration**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan migrate
```

Expected: `Migrated: 2026_04_24_400000_create_log_interaksi_table`.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/2026_04_24_400000_create_log_interaksi_table.php \
        backend/app/Models/LogInteraksi.php \
        backend/app/Models/Customer.php
git commit -m "feat(crm): add log_interaksi migration, LogInteraksi model, Customer relations"
```

---

## Task 2: Write Failing CrmTest (TDD)

**Files:**
- Create: `backend/tests/Feature/Crm/CrmTest.php`

- [ ] **Step 1: Write test file**

```php
<?php

namespace Tests\Feature\Crm;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Depot;
use App\Models\LogInteraksi;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrmTest extends TestCase
{
    use RefreshDatabase;

    private User     $cs;
    private Depot    $depot;
    private Customer $customer;
    private int      $musim;
    private int      $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot    = Depot::factory()->create();
        $this->cs       = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::CS_KETUA,
        ]);
        $this->customer = Customer::create([
            'nama' => 'Ahmad Fauzi', 'hp' => '081234567890',
            'alamat' => 'Jl. Mawar 1', 'kota' => 'Bandung',
        ]);
        $this->musim = (int) date('Y');
    }

    private function makeTransaksi(int $musim, array $attrs = []): Transaksi
    {
        $this->seq++;
        return Transaksi::create(array_merge([
            'depot_id'         => $this->depot->id,
            'no_faktur'        => "FAK-{$this->seq}",
            'customer_id'      => $this->customer->id,
            'tipe_qurban'      => 'SHQ',
            'jenis'            => 'SAPI',
            'kelas_id'         => 1,
            'harga'            => 10_000_000,
            'total'            => 10_000_000,
            'status_transaksi' => 'SELESAI',
            'musim'            => $musim,
        ], $attrs));
    }

    // ─── list customers ──────────────────────────────────────────────────────

    public function test_cs_can_list_customers(): void
    {
        $res = $this->actingAs($this->cs)->getJson('/api/crm/customer');

        $res->assertOk()->assertJsonStructure(['data' => [['id', 'nama', 'hp', 'kota']]]);
        $this->assertGreaterThanOrEqual(1, count($res->json('data')));
    }

    public function test_list_searchable_by_nama(): void
    {
        Customer::create(['nama' => 'Budi Santoso', 'hp' => '0811111111']);

        $res = $this->actingAs($this->cs)->getJson('/api/crm/customer?q=Ahmad');

        $this->assertCount(1, $res->json('data'));
        $this->assertEquals('Ahmad Fauzi', $res->json('data.0.nama'));
    }

    public function test_list_searchable_by_hp(): void
    {
        $res = $this->actingAs($this->cs)->getJson('/api/crm/customer?q=081234567890');

        $this->assertCount(1, $res->json('data'));
    }

    public function test_list_filterable_by_kota(): void
    {
        Customer::create(['nama' => 'Other', 'hp' => '0899', 'kota' => 'Jakarta']);

        $res = $this->actingAs($this->cs)->getJson('/api/crm/customer?wilayah=Bandung');

        $this->assertCount(1, $res->json('data'));
        $this->assertEquals('Bandung', $res->json('data.0.kota'));
    }

    // ─── detail ──────────────────────────────────────────────────────────────

    public function test_cs_can_get_customer_detail(): void
    {
        $res = $this->actingAs($this->cs)
            ->getJson("/api/crm/customer/{$this->customer->id}");

        $res->assertOk()
            ->assertJsonStructure([
                'customer' => ['id', 'nama', 'hp'],
                'transaksi',
                'logs',
                'is_repeat',
            ]);
    }

    public function test_is_repeat_true_for_multi_musim_customer(): void
    {
        $this->makeTransaksi($this->musim - 1);
        $this->makeTransaksi($this->musim);

        $res = $this->actingAs($this->cs)
            ->getJson("/api/crm/customer/{$this->customer->id}");

        $this->assertTrue($res->json('is_repeat'));
    }

    public function test_is_repeat_false_for_single_musim(): void
    {
        $this->makeTransaksi($this->musim);

        $res = $this->actingAs($this->cs)
            ->getJson("/api/crm/customer/{$this->customer->id}");

        $this->assertFalse($res->json('is_repeat'));
    }

    // ─── update ──────────────────────────────────────────────────────────────

    public function test_cs_can_update_customer(): void
    {
        $res = $this->actingAs($this->cs)
            ->putJson("/api/crm/customer/{$this->customer->id}", [
                'nama'  => 'Ahmad Updated',
                'hp'    => '081234567890',
                'kota'  => 'Jakarta',
            ]);

        $res->assertOk()->assertJsonPath('customer.kota', 'Jakarta');
        $this->assertDatabaseHas('customers', ['id' => $this->customer->id, 'kota' => 'Jakarta']);
    }

    // ─── log interaksi ────────────────────────────────────────────────────────

    public function test_cs_can_add_log(): void
    {
        $res = $this->actingAs($this->cs)
            ->postJson("/api/crm/customer/{$this->customer->id}/log", [
                'tanggal' => today()->toDateString(),
                'channel' => 'WA',
                'isi'     => 'Customer tanya jadwal pemotongan',
            ]);

        $res->assertCreated()->assertJsonPath('log.channel', 'WA');
        $this->assertDatabaseHas('log_interaksi', ['customer_id' => $this->customer->id, 'channel' => 'WA']);
    }

    public function test_log_validates_required_fields(): void
    {
        $this->actingAs($this->cs)
            ->postJson("/api/crm/customer/{$this->customer->id}/log", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tanggal', 'channel', 'isi']);
    }

    public function test_log_rejects_invalid_channel(): void
    {
        $this->actingAs($this->cs)
            ->postJson("/api/crm/customer/{$this->customer->id}/log", [
                'tanggal' => today()->toDateString(),
                'channel' => 'SMS',
                'isi'     => 'Test',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['channel']);
    }

    // ─── retargeting ─────────────────────────────────────────────────────────

    public function test_retargeting_returns_customers_from_prev_musim_not_current(): void
    {
        $this->makeTransaksi($this->musim - 1); // bought last season
        // no transaksi for current musim

        $other = Customer::create(['nama' => 'New Customer', 'hp' => '0822222222']);
        Transaksi::create([
            'depot_id' => $this->depot->id, 'no_faktur' => 'FAK-NEW',
            'customer_id' => $other->id, 'tipe_qurban' => 'SHQ',
            'jenis' => 'SAPI', 'kelas_id' => 1,
            'harga' => 10_000_000, 'total' => 10_000_000,
            'status_transaksi' => 'SELESAI', 'musim' => $this->musim,
        ]);

        $res = $this->actingAs($this->cs)
            ->getJson("/api/crm/customer/retargeting?musim={$this->musim}");

        $res->assertOk()->assertJsonStructure(['data', 'musim', 'prev_musim']);

        $ids = collect($res->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($this->customer->id));
        $this->assertFalse($ids->contains($other->id));
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson('/api/crm/customer')->assertUnauthorized();
    }
}
```

Save to `backend/tests/Feature/Crm/CrmTest.php`.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Crm/CrmTest.php --no-coverage 2>&1 | tail -10
```

Expected: all FAIL with 404.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/tests/Feature/Crm/CrmTest.php
git commit -m "test(crm): add failing CrmTest (TDD)"
```

---

## Task 3: CrmController + Routes

**Files:**
- Create: `backend/app/Http/Controllers/CrmController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write CrmController**

```php
<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\LogInteraksi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Customer::query();

        if ($q = $request->input('q')) {
            $query->where(fn($b) =>
                $b->where('nama', 'like', "%{$q}%")
                  ->orWhere('hp', 'like', "%{$q}%")
            );
        }

        if ($wilayah = $request->input('wilayah')) {
            $query->where('kota', 'like', "%{$wilayah}%");
        }

        return response()->json(['data' => $query->orderBy('nama')->limit(100)->get()]);
    }

    public function show(Customer $customer): JsonResponse
    {
        $transaksi = $customer->transaksi()
            ->with('kelas:id,kode,nama')
            ->orderBy('musim', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $isRepeat = $transaksi->pluck('musim')->unique()->count() > 1;

        $logs = $customer->logs()
            ->with('cs:id,name')
            ->orderBy('tanggal', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'customer'  => $customer,
            'transaksi' => $transaksi,
            'logs'      => $logs,
            'is_repeat' => $isRepeat,
        ]);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate([
            'nama'       => ['sometimes', 'string', 'max:150'],
            'hp'         => ['sometimes', 'string', 'max:20'],
            'alamat'     => ['nullable', 'string'],
            'kelurahan'  => ['nullable', 'string', 'max:100'],
            'kecamatan'  => ['nullable', 'string', 'max:100'],
            'kota'       => ['nullable', 'string', 'max:100'],
        ]);

        $customer->update($data);

        return response()->json(['customer' => $customer]);
    }

    public function storeLog(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate([
            'tanggal' => ['required', 'date'],
            'channel' => ['required', 'in:WA,TELEPON,EMAIL'],
            'isi'     => ['required', 'string'],
        ]);

        $log = LogInteraksi::create(array_merge($data, [
            'customer_id' => $customer->id,
            'cs_id'       => $request->user()?->id,
        ]));

        return response()->json(['log' => $log->load('cs:id,name')], 201);
    }

    public function retargeting(Request $request): JsonResponse
    {
        $musim     = (int) $request->input('musim', date('Y'));
        $prevMusim = $musim - 1;

        $customers = Customer::whereHas('transaksi', fn($q) => $q->where('musim', $prevMusim))
            ->whereDoesntHave('transaksi', fn($q) => $q->where('musim', $musim))
            ->with(['transaksi' => fn($q) => $q->where('musim', $prevMusim)
                ->select('id', 'customer_id', 'jenis', 'harga', 'musim', 'status_transaksi')
                ->orderBy('id')])
            ->orderBy('nama')
            ->limit(200)
            ->get();

        return response()->json([
            'data'      => $customers,
            'musim'     => $musim,
            'prev_musim' => $prevMusim,
        ]);
    }
}
```

Save to `backend/app/Http/Controllers/CrmController.php`.

- [ ] **Step 2: Register routes in `backend/routes/api.php`**

Inside `auth:sanctum`, add CRM routes. The static `retargeting` route MUST come before `{customer}` wildcard:

```php
// CRM
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,CS_KETUA,CS_ANGGOTA,ADMIN_KETUA')->group(function () {
    Route::get('crm/customer/retargeting',      [\App\Http\Controllers\CrmController::class, 'retargeting']);
    Route::get('crm/customer',                   [\App\Http\Controllers\CrmController::class, 'index']);
    Route::get('crm/customer/{customer}',        [\App\Http\Controllers\CrmController::class, 'show']);
    Route::put('crm/customer/{customer}',        [\App\Http\Controllers\CrmController::class, 'update']);
    Route::post('crm/customer/{customer}/log',   [\App\Http\Controllers\CrmController::class, 'storeLog']);
});
```

- [ ] **Step 3: Run tests — expect all green**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Crm/CrmTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 13 PASS. Fix any failures before continuing.

Note: `makeTransaksi` in the test uses `kelas_id: 1` — `kelas_hewan` table needs at least one row. If test fails with FK constraint, create a KelasHewan in setUp:
```php
\App\Models\KelasHewan::create(['kode' => 'A', 'nama' => 'Kelas A', 'urutan' => 1]);
```
Add this to the test setUp if needed.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/CrmController.php backend/routes/api.php
git commit -m "feat(crm): add CrmController + routes (list, detail, update, log, retargeting)"
```

---

## Task 4: Frontend — Customer List + Detail Pages

**Files:**
- Create: `frontend/app/(dashboard)/cs/customer/page.tsx`
- Create: `frontend/app/(dashboard)/cs/customer/[id]/page.tsx`

- [ ] **Step 1: Write customer list page**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface CustomerRow {
  id:   number
  nama: string
  hp:   string
  kota: string | null
}

export default function CsCustomerPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [q,         setQ]         = useState('')
  const [wilayah,   setWilayah]   = useState('')
  const [loading,   setLoading]   = useState(true)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q)       params.set('q',       q)
      if (wilayah) params.set('wilayah', wilayah)
      const res = await api.get(`/api/crm/customer?${params}`)
      setCustomers(res.data.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [q, wilayah])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Database Customer</h1>
          <p className="text-sm text-on-surface-variant mt-1">Profil & histori pembelian customer</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text" placeholder="Cari nama / no. HP..."
          value={q} onChange={(e) => setQ(e.target.value)}
          className="input-field text-sm flex-1 min-w-48"
        />
        <input
          type="text" placeholder="Filter kota / wilayah..."
          value={wilayah} onChange={(e) => setWilayah(e.target.value)}
          className="input-field text-sm w-48"
        />
      </div>

      <Card>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-surface rounded animate-pulse" />)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-high">
                {['Nama', 'No. HP', 'Kota', ''].map((h) => (
                  <th key={h} className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                  <td className="py-3 px-4 font-body font-medium text-on-surface">{c.nama}</td>
                  <td className="py-3 px-4 font-body text-on-surface-variant">{c.hp}</td>
                  <td className="py-3 px-4 font-body text-on-surface-variant">{c.kota ?? '—'}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => router.push(`/cs/customer/${c.id}`)}
                      className="text-xs text-primary hover:underline"
                    >
                      Detail →
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && !loading && (
                <tr><td colSpan={4} className="py-8 text-center text-on-surface-variant text-sm">Tidak ada customer ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/cs/customer/page.tsx`.

- [ ] **Step 2: Write customer detail page**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface Transaksi { id: number; jenis: string; harga: number; musim: number; status_transaksi: string; kelas: { kode: string } | null }
interface LogItem    { id: number; tanggal: string; channel: string; isi: string; cs: { name: string } | null }
interface Customer   { id: number; nama: string; hp: string; alamat: string | null; kota: string | null; kecamatan: string | null; kelurahan: string | null }

interface DetailData {
  customer:  Customer
  transaksi: Transaksi[]
  logs:      LogItem[]
  is_repeat: boolean
}

const CHANNEL_OPTIONS = ['WA', 'TELEPON', 'EMAIL']

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function CsCustomerDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [data,      setData]      = useState<DetailData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [logForm,   setLogForm]   = useState({ tanggal: new Date().toISOString().slice(0, 10), channel: 'WA', isi: '' })
  const [logSaving, setLogSaving] = useState(false)
  const [logError,  setLogError]  = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await api.get(`/api/crm/customer/${id}`)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function submitLog(e: React.FormEvent) {
    e.preventDefault()
    if (!logForm.isi.trim()) { setLogError('Isi log wajib diisi.'); return }
    setLogSaving(true)
    setLogError('')
    try {
      await api.post(`/api/crm/customer/${id}/log`, logForm)
      setLogForm({ tanggal: new Date().toISOString().slice(0, 10), channel: 'WA', isi: '' })
      await load()
    } catch (err: unknown) {
      setLogError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal simpan log.')
    } finally {
      setLogSaving(false)
    }
  }

  if (loading || !data) return <div className="p-8 text-center text-on-surface-variant">Memuat...</div>

  const { customer, transaksi, logs, is_repeat } = data

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/cs/customer" className="text-xs text-primary hover:underline">← Kembali</Link>
        <h1 className="font-display font-bold text-xl text-on-surface">{customer.nama}</h1>
        {is_repeat && (
          <span className="px-2 py-0.5 bg-primary text-on-primary text-xs font-semibold rounded-full">REPEAT CUSTOMER</span>
        )}
      </div>

      {/* Info */}
      <Card>
        <h2 className="font-display font-semibold text-base text-on-surface mb-3">Profil Customer</h2>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          {([
            ['HP',         customer.hp],
            ['Alamat',     customer.alamat ?? '—'],
            ['Kelurahan',  customer.kelurahan ?? '—'],
            ['Kecamatan',  customer.kecamatan ?? '—'],
            ['Kota',       customer.kota ?? '—'],
          ] as [string, string][]).map(([k, v]) => (
            <><span key={`k-${k}`} className="font-body text-on-surface-variant">{k}</span>
            <span key={`v-${k}`} className="font-body font-medium text-on-surface">{v}</span></>
          ))}
        </div>
        <div className="mt-3">
          <a
            href={`https://wa.me/62${customer.hp.replace(/^0/, '')}?text=${encodeURIComponent(`Halo ${customer.nama}, kami dari Tim Qurban.`)}`}
            target="_blank" rel="noopener noreferrer"
            className="text-sm text-green-600 hover:underline"
          >
            💬 Kirim WA
          </a>
        </div>
      </Card>

      {/* Histori Transaksi */}
      <Card>
        <h2 className="font-display font-semibold text-base text-on-surface mb-3">
          Histori Pembelian ({transaksi.length})
        </h2>
        {transaksi.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Belum ada transaksi.</p>
        ) : (
          <div className="space-y-2">
            {transaksi.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-surface-high last:border-0 text-sm">
                <div>
                  <span className="font-body font-medium text-on-surface">{t.musim} — {t.jenis} {t.kelas?.kode ?? ''}</span>
                  <span className="ml-2 text-xs text-on-surface-variant">{t.status_transaksi}</span>
                </div>
                <span className="font-display font-semibold text-primary">{rupiah(t.harga)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Log Interaksi */}
      <Card>
        <h2 className="font-display font-semibold text-base text-on-surface mb-3">Log Interaksi</h2>

        <form onSubmit={submitLog} className="space-y-3 mb-4 p-3 bg-surface-low rounded-lg">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Tanggal</label>
              <input
                type="date" value={logForm.tanggal}
                onChange={(e) => setLogForm((f) => ({ ...f, tanggal: e.target.value }))}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Channel</label>
              <select
                value={logForm.channel}
                onChange={(e) => setLogForm((f) => ({ ...f, channel: e.target.value }))}
                className="input-field text-sm"
              >
                {CHANNEL_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Isi</label>
            <textarea
              value={logForm.isi}
              onChange={(e) => setLogForm((f) => ({ ...f, isi: e.target.value }))}
              placeholder="Ringkasan interaksi..."
              className="input-field text-sm h-16 resize-none w-full"
            />
          </div>
          {logError && <p className="text-sm text-error">{logError}</p>}
          <Button type="submit" loading={logSaving} className="w-full">Tambah Log</Button>
        </form>

        {logs.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Belum ada log interaksi.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="border-b border-surface-high last:border-0 py-2 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-surface rounded text-xs font-medium">{l.channel}</span>
                  <span className="text-on-surface-variant text-xs">{l.tanggal}</span>
                  {l.cs && <span className="text-xs text-on-surface-variant ml-auto">{l.cs.name}</span>}
                </div>
                <p className="text-on-surface font-body">{l.isi}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/cs/customer/[id]/page.tsx`.

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output. Fix any type errors.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/cs/customer/"
git commit -m "feat(crm): add CS customer list + detail pages"
```

---

## Task 5: Frontend — Retargeting Page + Sidebar

**Files:**
- Create: `frontend/app/(dashboard)/cs/retargeting/page.tsx`
- Modify: `frontend/components/shared/Sidebar.tsx`

- [ ] **Step 1: Write retargeting page**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface RetargetCustomer {
  id:        number
  nama:      string
  hp:        string
  kota:      string | null
  transaksi: Array<{ jenis: string; harga: number; musim: number }>
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function RetargetingPage() {
  const currentYear = new Date().getFullYear()

  const [customers, setCustomers] = useState<RetargetCustomer[]>([])
  const [musim,     setMusim]     = useState(currentYear)
  const [loading,   setLoading]   = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/crm/customer/retargeting?musim=${musim}`)
      setCustomers(res.data.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [musim])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Retargeting</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Customer yang beli musim lalu tapi belum order musim {musim}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Musim</label>
          <input
            type="number" min="2020" max="2099"
            value={musim} onChange={(e) => setMusim(Number(e.target.value))}
            className="input-field text-sm w-24"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-surface rounded animate-pulse" />)}
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-on-surface-variant text-sm">
            Semua customer musim {musim - 1} sudah order musim {musim}. 🎉
          </p>
        </Card>
      ) : (
        <Card>
          <div className="mb-3 text-sm text-on-surface-variant">
            {customers.length} customer perlu di-follow-up
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high">
                  {['Nama', 'HP', 'Kota', 'Pembelian Lalu', 'Aksi'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const lastBuy = c.transaksi[0]
                  return (
                    <tr key={c.id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                      <td className="py-3 px-4 font-body font-medium text-on-surface">{c.nama}</td>
                      <td className="py-3 px-4 font-body text-on-surface-variant">{c.hp}</td>
                      <td className="py-3 px-4 font-body text-on-surface-variant">{c.kota ?? '—'}</td>
                      <td className="py-3 px-4 font-body text-on-surface-variant">
                        {lastBuy ? `${lastBuy.jenis} ${rupiah(lastBuy.harga)}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={`https://wa.me/62${c.hp.replace(/^0/, '')}?text=${encodeURIComponent(`Halo ${c.nama}, kami dari Tim Qurban. Tahun ini kami kembali hadir dengan pilihan hewan qurban pilihan. Apakah Anda berminat untuk order musim ${musim}?`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:underline whitespace-nowrap"
                        >
                          💬 Kirim WA
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/cs/retargeting/page.tsx`.

- [ ] **Step 2: Update Sidebar**

In `frontend/components/shared/Sidebar.tsx`:

Add `UserCheck` and `Target` to lucide-react import (current last: `Inbox`):
```tsx
  Wallet, Truck, ClipboardList, ClipboardCheck, LogOut, Database, PawPrint, Grid3x3, Receipt, Layers, BarChart2, HandCoins, BookOpen, TrendingUp, Inbox, UserCheck, Target
```

Add nav items after `/cs/order`:
```tsx
  { href: '/cs/order',     label: 'Order Katalog', icon: Inbox,      roles: ['SUPER_ADMIN','KEPALA_DEPOT','CS_KETUA','CS_ANGGOTA','ADMIN_KETUA'] },
  { href: '/cs/customer',  label: 'Database Customer', icon: UserCheck,  roles: ['SUPER_ADMIN','KEPALA_DEPOT','CS_KETUA','CS_ANGGOTA','ADMIN_KETUA'] },
  { href: '/cs/retargeting', label: 'Retargeting',   icon: Target,     roles: ['SUPER_ADMIN','KEPALA_DEPOT','CS_KETUA','CS_ANGGOTA','ADMIN_KETUA'] },
```

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/cs/retargeting/page.tsx" frontend/components/shared/Sidebar.tsx
git commit -m "feat(crm): add retargeting page + customer + retargeting sidebar links"
```

---

## Task 6: Verification + Close T-16

**Files:**
- Modify: `docs/tasks/T-16-crm-customer.md`
- Modify: `docs/TASKS.md`

- [ ] **Step 1: Run backend tests**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Crm/CrmTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 13 tests PASS.

- [ ] **Step 2: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -5
```

Expected: no output.

- [ ] **Step 3: Smoke test checklist**

- [ ] `/cs/customer` loads, shows customer list
- [ ] Search by name/HP filters the list
- [ ] Detail link opens `/cs/customer/{id}` with histori + log form
- [ ] REPEAT CUSTOMER badge shows for multi-musim customers
- [ ] WA link on detail page opens wa.me
- [ ] Tambah Log saves and refreshes
- [ ] `/cs/retargeting` shows customers from prev musim not current
- [ ] Kirim WA button on retargeting table opens wa.me

- [ ] **Step 4: Update T-16 task doc**

In `docs/tasks/T-16-crm-customer.md`:
- `**Status:** \`TODO\`` → `**Status:** \`DONE\``
- All `- [ ]` → `- [x]`
- Add to Notes: "CRM laporan statistik endpoint deferred. OrderKatalog not linked by FK (no customer_id) — linked by HP match in future iteration. Log interaksi WA notification (T-17) deferred."

- [ ] **Step 5: Update TASKS.md**

- T-16 row: `⬜ TODO` → `✅ DONE`
- Phase 2 progress: `7 / 10` → `8 / 10`
- Summary: Phase 2 Selesai `7→8`, Sisa `3→2`; TOTAL Selesai `15→16`, Sisa `10→9`

- [ ] **Step 6: Commit + tag**

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-16-crm-customer.md docs/TASKS.md
git commit -m "docs: mark T-16 CRM Customer as DONE"
git tag t-16-complete
```

---

## Acceptance Criteria Checklist

- [ ] Customer list with search (nama/HP) + filter (kota/wilayah)
- [ ] Customer detail: profil, histori transaksi, log interaksi, WA link
- [ ] REPEAT CUSTOMER badge when multi-musim purchase history
- [ ] Log interaksi: tanggal, channel (WA/TELEPON/EMAIL), isi, CS yang handle
- [ ] Retargeting: prev-musim customers not yet in current musim
- [ ] All 13 backend tests pass
- [ ] TypeScript clean
