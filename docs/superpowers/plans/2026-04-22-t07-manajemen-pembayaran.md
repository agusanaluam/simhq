# T-07 Manajemen Pembayaran Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tracking pembayaran per transaksi — DP/pelunasan, biaya tambahan, sisa otomatis, status_bayar otomatis (BELUM_BAYAR→DP→LUNAS), rekap setoran harian per metode.

**Architecture:** Backend — 3 migrations (add status_bayar ke transaksi, buat pembayaran, buat biaya_tambahan), 3 enums, 2 models baru, PembayaranService syncStatusBayar, PembayaranController 4 endpoints, 7 tests TDD. Frontend — halaman detail transaksi dengan section pembayaran, halaman rekap-setoran harian.

**Tech Stack:** Laravel 11, PostgreSQL, Next.js 14, TypeScript, Tailwind

---

## File Map

### Backend — Created
```
backend/
  database/migrations/XXXX_add_status_bayar_to_transaksi_table.php
  database/migrations/XXXX_create_pembayaran_table.php
  database/migrations/XXXX_create_biaya_tambahan_table.php
  app/Enums/StatusBayar.php
  app/Enums/MetodeBayar.php
  app/Enums/TipeBayar.php
  app/Models/Pembayaran.php
  app/Models/BiayaTambahan.php
  app/Services/PembayaranService.php
  app/Http/Controllers/PembayaranController.php
  tests/Feature/Keuangan/PembayaranTest.php
```

### Backend — Modified
```
  app/Models/Transaksi.php  ← add status_bayar to fillable/casts + hasMany relations
  routes/api.php            ← add pembayaran + laporan routes
```

### Frontend — Created
```
frontend/
  app/(dashboard)/depot/transaksi/[id]/page.tsx
  app/(dashboard)/depot/keuangan/rekap-setoran/page.tsx
```

### Frontend — Modified
```
  frontend/app/(dashboard)/depot/transaksi/page.tsx  ← add link to detail per row
  frontend/components/shared/Sidebar.tsx              ← add Rekap Setoran link
```

---

## Task 1: Migrations

- [ ] **Step 1: Generate migration files**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan make:migration add_status_bayar_to_transaksi_table
php artisan make:migration create_pembayaran_table
php artisan make:migration create_biaya_tambahan_table
```

- [ ] **Step 2: Fill add_status_bayar_to_transaksi migration**

```php
public function up(): void
{
    Schema::table('transaksi', function (Blueprint $table) {
        $table->enum('status_bayar', ['BELUM_BAYAR', 'DP', 'LUNAS'])
              ->default('BELUM_BAYAR')
              ->after('total');
    });
}
public function down(): void
{
    Schema::table('transaksi', function (Blueprint $table) {
        $table->dropColumn('status_bayar');
    });
}
```

- [ ] **Step 3: Fill pembayaran migration**

```php
public function up(): void
{
    Schema::create('pembayaran', function (Blueprint $table) {
        $table->id();
        $table->foreignId('transaksi_id')->constrained('transaksi')->cascadeOnDelete();
        $table->unsignedInteger('jumlah');
        $table->enum('tipe', ['DP', 'PELUNASAN']);
        $table->enum('metode', ['CASH', 'TRANSFER_BCA', 'TRANSFER_LAIN'])->default('CASH');
        $table->foreignId('teller_id')->nullable()->constrained('users')->nullOnDelete();
        $table->date('tgl_bayar');
        $table->text('catatan')->nullable();
        $table->timestamps();
    });
}
public function down(): void { Schema::dropIfExists('pembayaran'); }
```

- [ ] **Step 4: Fill biaya_tambahan migration**

```php
public function up(): void
{
    Schema::create('biaya_tambahan', function (Blueprint $table) {
        $table->id();
        $table->foreignId('transaksi_id')->constrained('transaksi')->cascadeOnDelete();
        $table->string('keterangan', 200);
        $table->unsignedInteger('jumlah');
        $table->timestamps();
    });
}
public function down(): void { Schema::dropIfExists('biaya_tambahan'); }
```

- [ ] **Step 5: Run migrations**

```bash
php artisan migrate
```

Expected: 3 tables/columns updated, no errors.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/
git commit -m "feat(db): add status_bayar to transaksi + pembayaran + biaya_tambahan tables"
```

---

## Task 2: Enums + Models + Update Transaksi

- [ ] **Step 1: Create StatusBayar enum**

```php
<?php
// backend/app/Enums/StatusBayar.php
namespace App\Enums;

enum StatusBayar: string
{
    case BELUM_BAYAR = 'BELUM_BAYAR';
    case DP          = 'DP';
    case LUNAS       = 'LUNAS';
}
```

- [ ] **Step 2: Create MetodeBayar enum**

```php
<?php
// backend/app/Enums/MetodeBayar.php
namespace App\Enums;

enum MetodeBayar: string
{
    case CASH         = 'CASH';
    case TRANSFER_BCA = 'TRANSFER_BCA';
    case TRANSFER_LAIN= 'TRANSFER_LAIN';
}
```

- [ ] **Step 3: Create TipeBayar enum**

```php
<?php
// backend/app/Enums/TipeBayar.php
namespace App\Enums;

enum TipeBayar: string
{
    case DP        = 'DP';
    case PELUNASAN = 'PELUNASAN';
}
```

- [ ] **Step 4: Create Pembayaran model**

```php
<?php
// backend/app/Models/Pembayaran.php
namespace App\Models;

use App\Enums\MetodeBayar;
use App\Enums\TipeBayar;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pembayaran extends Model
{
    protected $table = 'pembayaran';

    protected $fillable = [
        'transaksi_id', 'jumlah', 'tipe', 'metode',
        'teller_id', 'tgl_bayar', 'catatan',
    ];

    protected $casts = [
        'jumlah'   => 'integer',
        'tipe'     => TipeBayar::class,
        'metode'   => MetodeBayar::class,
        'tgl_bayar'=> 'date',
    ];

    public function transaksi(): BelongsTo { return $this->belongsTo(Transaksi::class); }
    public function teller(): BelongsTo    { return $this->belongsTo(User::class, 'teller_id'); }
}
```

- [ ] **Step 5: Create BiayaTambahan model**

```php
<?php
// backend/app/Models/BiayaTambahan.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BiayaTambahan extends Model
{
    protected $table = 'biaya_tambahan';

    protected $fillable = ['transaksi_id', 'keterangan', 'jumlah'];

    protected $casts = ['jumlah' => 'integer'];

    public function transaksi(): BelongsTo { return $this->belongsTo(Transaksi::class); }
}
```

- [ ] **Step 6: Update Transaksi model**

Read `backend/app/Models/Transaksi.php`. Add:
- `'status_bayar'` to `$fillable` (after `'total'`)
- `'status_bayar' => StatusBayar::class` to `$casts`
- `'status_bayar' => 'BELUM_BAYAR'` to `$attributes`
- Add `use App\Enums\StatusBayar;` import
- Add two HasMany relations at the bottom:

```php
use App\Enums\StatusBayar;
use Illuminate\Database\Eloquent\Relations\HasMany;

// In $fillable — insert after 'total':
'status_bayar',

// In $casts — add:
'status_bayar' => StatusBayar::class,

// In $attributes — add:
'status_bayar' => 'BELUM_BAYAR',

// Add relations:
public function pembayaran(): HasMany    { return $this->hasMany(Pembayaran::class, 'transaksi_id'); }
public function biayaTambahan(): HasMany { return $this->hasMany(BiayaTambahan::class, 'transaksi_id'); }
```

- [ ] **Step 7: Create PembayaranService**

```php
<?php
// backend/app/Services/PembayaranService.php
namespace App\Services;

use App\Enums\StatusBayar;
use App\Models\Pembayaran;
use App\Models\Transaksi;

class PembayaranService
{
    public function syncStatusBayar(Transaksi $transaksi): void
    {
        $totalBayar = Pembayaran::where('transaksi_id', $transaksi->id)->sum('jumlah');
        $sisa       = $transaksi->total - $totalBayar;

        $status = match(true) {
            $sisa <= 0        => StatusBayar::LUNAS->value,
            $totalBayar > 0   => StatusBayar::DP->value,
            default           => StatusBayar::BELUM_BAYAR->value,
        };

        $transaksi->update(['status_bayar' => $status]);
    }

    public function sisaPelunasan(Transaksi $transaksi): int
    {
        $totalBayar = Pembayaran::where('transaksi_id', $transaksi->id)->sum('jumlah');
        return max(0, $transaksi->total - $totalBayar);
    }
}
```

- [ ] **Step 8: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Enums/ backend/app/Models/Pembayaran.php backend/app/Models/BiayaTambahan.php backend/app/Models/Transaksi.php backend/app/Services/PembayaranService.php
git commit -m "feat(keuangan): StatusBayar/MetodeBayar/TipeBayar enums + Pembayaran/BiayaTambahan models + PembayaranService"
```

---

## Task 3: Tests (TDD — write failing first)

- [ ] **Step 1: Create test file**

```php
<?php
// backend/tests/Feature/Keuangan/PembayaranTest.php
namespace Tests\Feature\Keuangan;

use App\Models\Customer;
use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\Pembayaran;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PembayaranTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Transaksi $transaksi;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin   = User::factory()->superAdmin()->create();
        $depot         = Depot::factory()->create();
        $kelas         = KelasHewan::create(['kode' => 'A1', 'nama' => 'Kelas A1', 'urutan' => 1]);
        $customer      = Customer::create(['nama' => 'Budi', 'hp' => '08111']);

        $this->transaksi = Transaksi::create([
            'depot_id'        => $depot->id,
            'no_faktur'       => '1-2026-0001',
            'customer_id'     => $customer->id,
            'tipe_qurban'     => 'SHQ',
            'jenis'           => 'SAPI',
            'kelas_id'        => $kelas->id,
            'harga'           => 6000000,
            'total'           => 6000000,
            'status_transaksi'=> 'DIKONFIRMASI',
            'musim'           => 2026,
        ]);
    }

    private function bayarPayload(array $overrides = []): array
    {
        return array_merge([
            'jumlah'   => 2000000,
            'tipe'     => 'DP',
            'metode'   => 'CASH',
            'tgl_bayar'=> '2026-04-22',
        ], $overrides);
    }

    public function test_bayar_dp_sets_status_bayar_dp(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/bayar", $this->bayarPayload())
            ->assertCreated()
            ->assertJsonPath('pembayaran.tipe', 'DP');

        $this->assertDatabaseHas('transaksi', [
            'id'          => $this->transaksi->id,
            'status_bayar'=> 'DP',
        ]);
    }

    public function test_bayar_lunas_sekaligus(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/bayar", $this->bayarPayload([
                'jumlah' => 6000000,
                'tipe'   => 'PELUNASAN',
            ]))
            ->assertCreated();

        $this->assertDatabaseHas('transaksi', [
            'id'          => $this->transaksi->id,
            'status_bayar'=> 'LUNAS',
        ]);
    }

    public function test_dp_then_pelunasan_jadi_lunas(): void
    {
        // Bayar DP dulu
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/bayar", $this->bayarPayload(['jumlah' => 2000000]));

        // Bayar sisa
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/bayar", $this->bayarPayload([
                'jumlah' => 4000000,
                'tipe'   => 'PELUNASAN',
            ]))
            ->assertCreated();

        $this->assertDatabaseHas('transaksi', [
            'id'          => $this->transaksi->id,
            'status_bayar'=> 'LUNAS',
        ]);
    }

    public function test_sisa_pelunasan_tampil_di_detail(): void
    {
        Pembayaran::create([
            'transaksi_id' => $this->transaksi->id,
            'jumlah'       => 2000000,
            'tipe'         => 'DP',
            'metode'       => 'CASH',
            'tgl_bayar'    => '2026-04-22',
        ]);

        $this->actingAs($this->admin)
            ->getJson("/api/transaksi/{$this->transaksi->id}/pembayaran")
            ->assertOk()
            ->assertJsonPath('sisa_pelunasan', 4000000)
            ->assertJsonStructure(['pembayaran', 'total_bayar', 'sisa_pelunasan']);
    }

    public function test_biaya_tambahan_naik_total(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/transaksi/{$this->transaksi->id}/biaya-tambahan", [
                'keterangan' => 'Ongkos kirim',
                'jumlah'     => 200000,
            ])
            ->assertCreated()
            ->assertJsonPath('transaksi.total', 6200000);
    }

    public function test_rekap_setoran_per_hari(): void
    {
        Pembayaran::create([
            'transaksi_id' => $this->transaksi->id,
            'jumlah'       => 3000000,
            'tipe'         => 'DP',
            'metode'       => 'CASH',
            'tgl_bayar'    => '2026-04-22',
        ]);

        $this->actingAs($this->admin)
            ->getJson('/api/laporan/rekap-setoran?tgl=2026-04-22')
            ->assertOk()
            ->assertJsonStructure(['rekap' => [['metode', 'total', 'jumlah_transaksi']]]);
    }

    public function test_list_pembayaran(): void
    {
        Pembayaran::create([
            'transaksi_id' => $this->transaksi->id,
            'jumlah'       => 1000000,
            'tipe'         => 'DP',
            'metode'       => 'TRANSFER_BCA',
            'tgl_bayar'    => '2026-04-22',
        ]);

        $this->actingAs($this->admin)
            ->getJson("/api/transaksi/{$this->transaksi->id}/pembayaran")
            ->assertOk()
            ->assertJsonStructure(['pembayaran' => [['id', 'jumlah', 'tipe', 'metode', 'tgl_bayar']]]);
    }
}
```

- [ ] **Step 2: Run — confirm FAIL**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan test tests/Feature/Keuangan/PembayaranTest.php
```

Expected: FAIL (routes not exist).

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/tests/Feature/Keuangan/PembayaranTest.php
git commit -m "test(keuangan): 7 failing PembayaranTest — TDD red phase"
```

---

## Task 4: PembayaranController + Routes

- [ ] **Step 1: Create PembayaranController**

```php
<?php
// backend/app/Http/Controllers/PembayaranController.php
namespace App\Http\Controllers;

use App\Models\BiayaTambahan;
use App\Models\Pembayaran;
use App\Models\Transaksi;
use App\Services\PembayaranService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PembayaranController extends Controller
{
    public function __construct(private PembayaranService $svc) {}

    public function index(Transaksi $transaksi): JsonResponse
    {
        $pembayaran = Pembayaran::with('teller:id,name')
            ->where('transaksi_id', $transaksi->id)
            ->orderBy('tgl_bayar')
            ->get();

        return response()->json([
            'pembayaran'     => $pembayaran,
            'total_bayar'    => $pembayaran->sum('jumlah'),
            'sisa_pelunasan' => $this->svc->sisaPelunasan($transaksi),
        ]);
    }

    public function store(Request $request, Transaksi $transaksi): JsonResponse
    {
        $data = $request->validate([
            'jumlah'   => ['required', 'integer', 'min:1'],
            'tipe'     => ['required', 'in:DP,PELUNASAN'],
            'metode'   => ['required', 'in:CASH,TRANSFER_BCA,TRANSFER_LAIN'],
            'teller_id'=> ['nullable', 'exists:users,id'],
            'tgl_bayar'=> ['required', 'date'],
            'catatan'  => ['nullable', 'string', 'max:500'],
        ]);

        $pembayaran = Pembayaran::create(array_merge($data, ['transaksi_id' => $transaksi->id]));

        $this->svc->syncStatusBayar($transaksi);

        return response()->json(['pembayaran' => $pembayaran->load('teller:id,name')], 201);
    }

    public function storeBiaya(Request $request, Transaksi $transaksi): JsonResponse
    {
        $data = $request->validate([
            'keterangan' => ['required', 'string', 'max:200'],
            'jumlah'     => ['required', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($data, $transaksi) {
            BiayaTambahan::create(array_merge($data, ['transaksi_id' => $transaksi->id]));
            $transaksi->increment('total', $data['jumlah']);
        });

        $this->svc->syncStatusBayar($transaksi->fresh());

        return response()->json(['transaksi' => $transaksi->fresh()], 201);
    }

    public function rekapSetoran(Request $request): JsonResponse
    {
        $tgl   = $request->tgl ?? today()->toDateString();
        $depot = $request->depot;

        $rekap = Pembayaran::query()
            ->join('transaksi', 'pembayaran.transaksi_id', '=', 'transaksi.id')
            ->where('pembayaran.tgl_bayar', $tgl)
            ->when($depot, fn($q) => $q->where('transaksi.depot_id', $depot))
            ->groupBy('pembayaran.metode')
            ->select(
                'pembayaran.metode',
                DB::raw('SUM(pembayaran.jumlah) as total'),
                DB::raw('COUNT(DISTINCT pembayaran.transaksi_id) as jumlah_transaksi')
            )
            ->get();

        return response()->json(['rekap' => $rekap, 'tgl' => $tgl]);
    }
}
```

- [ ] **Step 2: Add routes to api.php**

Inside `auth:sanctum` group, after transaksi routes, add:

```php
use App\Http\Controllers\PembayaranController;

// Pembayaran (per transaksi)
Route::get('transaksi/{transaksi}/pembayaran',        [PembayaranController::class, 'index']);
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_ANGGOTA')->group(function () {
    Route::post('transaksi/{transaksi}/bayar',          [PembayaranController::class, 'store']);
    Route::post('transaksi/{transaksi}/biaya-tambahan', [PembayaranController::class, 'storeBiaya']);
});

// Laporan
Route::get('laporan/rekap-setoran', [PembayaranController::class, 'rekapSetoran']);
```

- [ ] **Step 3: Run tests — confirm 7 pass**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan test tests/Feature/Keuangan/PembayaranTest.php
```

- [ ] **Step 4: Run full suite — no regression**

```bash
php artisan test
```

Expected: 56 tests pass (49 previous + 7 new).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/PembayaranController.php backend/routes/api.php
git commit -m "feat(keuangan): PembayaranController + 7 tests passing"
```

---

## Task 5: Frontend — Detail Transaksi + Update List Page

### Files
- Create: `frontend/app/(dashboard)/depot/transaksi/[id]/page.tsx`
- Modify: `frontend/app/(dashboard)/depot/transaksi/page.tsx` (add link per row)

- [ ] **Step 1: Create detail transaksi page**

```tsx
// frontend/app/(dashboard)/depot/transaksi/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'

interface PembayaranEntry {
  id: number
  jumlah: number
  tipe: string
  metode: string
  tgl_bayar: string
  catatan: string | null
  teller: { name: string } | null
}

interface TransaksiDetail {
  id: number
  no_faktur: string
  tipe_qurban: string
  jenis: string
  total: number
  status_transaksi: string
  status_bayar: string
  customer: { nama: string; hp: string } | null
  hewan: { no_hewan: string } | null
  kelas: { kode: string } | null
}

const STATUS_BAYAR_COLOR: Record<string, string> = {
  BELUM_BAYAR: 'bg-red-100 text-red-700',
  DP:          'bg-yellow-100 text-yellow-800',
  LUNAS:       'bg-green-100 text-green-800',
}

const STATUS_BAYAR_LABEL: Record<string, string> = {
  BELUM_BAYAR: 'Belum Bayar',
  DP:          'DP',
  LUNAS:       'Lunas',
}

export default function TransaksiDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [transaksi, setTransaksi] = useState<TransaksiDetail | null>(null)
  const [pembayaran, setPembayaran] = useState<PembayaranEntry[]>([])
  const [totalBayar, setTotalBayar] = useState(0)
  const [sisaPelunasan, setSisa]    = useState(0)
  const [loading, setLoading]       = useState(true)

  // Form state
  const [jumlah, setJumlah]     = useState('')
  const [tipe, setTipe]         = useState('DP')
  const [metode, setMetode]     = useState('CASH')
  const [tglBayar, setTglBayar] = useState(new Date().toISOString().slice(0, 10))
  const [catatan, setCatatan]   = useState('')
  const [saving, setSaving]     = useState(false)

  // Biaya tambahan form
  const [ket, setKet]           = useState('')
  const [biaya, setBiaya]       = useState('')
  const [savingBiaya, setSavingBiaya] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [trxRes, bayarRes] = await Promise.all([
        api.get(`/api/transaksi/${id}`),
        api.get(`/api/transaksi/${id}/pembayaran`),
      ])
      setTransaksi(trxRes.data.transaksi)
      setPembayaran(bayarRes.data.pembayaran ?? [])
      setTotalBayar(bayarRes.data.total_bayar ?? 0)
      setSisa(bayarRes.data.sisa_pelunasan ?? 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function submitBayar() {
    if (!jumlah || parseInt(jumlah) <= 0) return
    setSaving(true)
    try {
      await api.post(`/api/transaksi/${id}/bayar`, {
        jumlah: parseInt(jumlah),
        tipe, metode, tgl_bayar: tglBayar, catatan,
      })
      setJumlah(''); setCatatan('')
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function submitBiaya() {
    if (!ket.trim() || !biaya || parseInt(biaya) <= 0) return
    setSavingBiaya(true)
    try {
      await api.post(`/api/transaksi/${id}/biaya-tambahan`, {
        keterangan: ket, jumlah: parseInt(biaya),
      })
      setKet(''); setBiaya('')
      await load()
    } finally {
      setSavingBiaya(false)
    }
  }

  if (loading) return <p className="text-sm text-on-surface-variant p-8">Memuat...</p>
  if (!transaksi) return <p className="text-sm text-red-600 p-8">Transaksi tidak ditemukan</p>

  const pct = transaksi.total > 0 ? Math.min((totalBayar / transaksi.total) * 100, 100) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-on-surface-variant hover:text-on-surface text-sm">← Kembali</button>
        <h1 className="font-display font-bold text-2xl text-on-surface">{transaksi.no_faktur}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-body font-semibold ${STATUS_BAYAR_COLOR[transaksi.status_bayar] ?? ''}`}>
          {STATUS_BAYAR_LABEL[transaksi.status_bayar] ?? transaksi.status_bayar}
        </span>
      </div>

      {/* Info transaksi */}
      <Card>
        <h2 className="font-display font-semibold text-on-surface mb-3">Info Transaksi</h2>
        <div className="grid grid-cols-2 gap-2 text-sm font-body">
          <div><span className="text-on-surface-variant">Pembeli:</span> <span className="font-medium">{transaksi.customer?.nama}</span></div>
          <div><span className="text-on-surface-variant">HP:</span> <span>{transaksi.customer?.hp}</span></div>
          <div><span className="text-on-surface-variant">Hewan:</span> <span>{transaksi.hewan ? `#${transaksi.hewan.no_hewan}` : 'Pre-order'}</span></div>
          <div><span className="text-on-surface-variant">Tipe:</span> <span>{transaksi.tipe_qurban} · {transaksi.jenis} · {transaksi.kelas?.kode}</span></div>
          <div><span className="text-on-surface-variant">Total Tagihan:</span> <span className="font-semibold text-primary">{transaksi.total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}</span></div>
          <div><span className="text-on-surface-variant">Sisa:</span> <span className={`font-semibold ${sisaPelunasan > 0 ? 'text-red-600' : 'text-green-700'}`}>{sisaPelunasan.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}</span></div>
        </div>

        {/* Progress pelunasan */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-on-surface-variant mb-1 font-body">
            <span>Pelunasan</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="h-2 bg-surface-high rounded-full">
            <div
              className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Riwayat pembayaran */}
      <Card>
        <h2 className="font-display font-semibold text-on-surface mb-3">Riwayat Pembayaran</h2>
        {pembayaran.length === 0 ? (
          <p className="text-sm text-on-surface-variant italic">Belum ada pembayaran</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high text-xs text-on-surface-variant font-body text-left">
                  <th className="pb-2 pr-3">Tgl</th>
                  <th className="pb-2 pr-3">Jumlah</th>
                  <th className="pb-2 pr-3">Tipe</th>
                  <th className="pb-2 pr-3">Metode</th>
                  <th className="pb-2">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {pembayaran.map(p => (
                  <tr key={p.id} className="border-b border-surface-high last:border-0">
                    <td className="py-2 pr-3 font-body text-on-surface">{p.tgl_bayar}</td>
                    <td className="py-2 pr-3 font-body font-medium text-on-surface">
                      {p.jumlah.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2 pr-3 font-body text-xs">{p.tipe}</td>
                    <td className="py-2 pr-3 font-body text-xs">{p.metode.replace('_', ' ')}</td>
                    <td className="py-2 text-xs text-on-surface-variant">{p.catatan ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Form input bayar baru */}
      {transaksi.status_bayar !== 'LUNAS' && (
        <Card>
          <h2 className="font-display font-semibold text-on-surface mb-4">Input Pembayaran</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-body font-medium text-on-surface mb-1">Jumlah (Rp) *</label>
                <Input type="number" value={jumlah} onChange={e => setJumlah(e.target.value)} placeholder="2000000" />
              </div>
              <div>
                <label className="block text-xs font-body font-medium text-on-surface mb-1">Tanggal</label>
                <Input type="date" value={tglBayar} onChange={e => setTglBayar(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-body font-medium text-on-surface mb-1">Tipe</label>
              <div className="flex gap-2">
                {['DP', 'PELUNASAN'].map(t => (
                  <button key={t} onClick={() => setTipe(t)}
                    className={`px-3 py-1 rounded-lg border-2 text-xs font-body transition-colors ${tipe === t ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-body font-medium text-on-surface mb-1">Metode</label>
              <div className="flex gap-2 flex-wrap">
                {[['CASH','Cash'],['TRANSFER_BCA','Transfer BCA'],['TRANSFER_LAIN','Transfer Lain']].map(([val,lbl]) => (
                  <button key={val} onClick={() => setMetode(val)}
                    className={`px-3 py-1 rounded-lg border-2 text-xs font-body transition-colors ${metode === val ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-body font-medium text-on-surface mb-1">Catatan</label>
              <Input value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Opsional..." />
            </div>

            <Button onClick={submitBayar} loading={saving} disabled={!jumlah || parseInt(jumlah) <= 0}>
              Simpan Pembayaran
            </Button>
          </div>
        </Card>
      )}

      {/* Form biaya tambahan */}
      <Card>
        <h2 className="font-display font-semibold text-on-surface mb-4">Biaya Tambahan</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Keterangan *</label>
            <Input value={ket} onChange={e => setKet(e.target.value)} placeholder="Ongkos kirim..." />
          </div>
          <div className="w-36">
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Jumlah (Rp) *</label>
            <Input type="number" value={biaya} onChange={e => setBiaya(e.target.value)} placeholder="200000" />
          </div>
          <Button onClick={submitBiaya} loading={savingBiaya} disabled={!ket.trim() || !biaya}>
            Tambah
          </Button>
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Add detail link to transaksi list page**

In `frontend/app/(dashboard)/depot/transaksi/page.tsx`, find the No Faktur column cell:

```tsx
<td className="py-2 pr-4 font-body font-medium text-primary">{t.no_faktur}</td>
```

Replace with:

```tsx
<td className="py-2 pr-4">
  <Link href={`/depot/transaksi/${t.id}`} className="font-body font-medium text-primary hover:underline">
    {t.no_faktur}
  </Link>
</td>
```

---

## Task 6: Frontend — Rekap Setoran Page + Sidebar

### Files
- Create: `frontend/app/(dashboard)/depot/keuangan/rekap-setoran/page.tsx`
- Modify: `frontend/components/shared/Sidebar.tsx`

- [ ] **Step 1: Create rekap-setoran page**

```tsx
// frontend/app/(dashboard)/depot/keuangan/rekap-setoran/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'

interface RekapEntry {
  metode: string
  total: number
  jumlah_transaksi: number
}

const METODE_LABEL: Record<string, string> = {
  CASH:          'Cash',
  TRANSFER_BCA:  'Transfer BCA',
  TRANSFER_LAIN: 'Transfer Lain',
}

const METODE_COLOR: Record<string, string> = {
  CASH:          'bg-green-50 border-green-300 text-green-800',
  TRANSFER_BCA:  'bg-blue-50 border-blue-300 text-blue-800',
  TRANSFER_LAIN: 'bg-purple-50 border-purple-300 text-purple-800',
}

export default function RekapSetoranPage() {
  const today   = new Date().toISOString().slice(0, 10)
  const [tgl, setTgl]     = useState(today)
  const [rekap, setRekap] = useState<RekapEntry[]>([])
  const [loading, setLoading] = useState(false)

  function load(date: string) {
    setLoading(true)
    api.get(`/api/laporan/rekap-setoran?tgl=${date}`)
      .then(r => setRekap(r.data.rekap ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(tgl) }, [tgl])

  const grandTotal = rekap.reduce((s, r) => s + Number(r.total), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Rekap Setoran</h1>
          <p className="text-sm text-on-surface-variant mt-1">Total penerimaan per metode per hari</p>
        </div>
        <div className="w-44">
          <Input type="date" value={tgl} onChange={e => setTgl(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant py-8 text-center">Memuat...</p>
      ) : rekap.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-8 text-center">Tidak ada setoran pada tanggal ini</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {rekap.map(r => (
              <Card key={r.metode} className={`border-2 ${METODE_COLOR[r.metode] ?? 'bg-surface-high border-surface-highest'}`}>
                <p className="font-body font-semibold text-sm mb-1">{METODE_LABEL[r.metode] ?? r.metode}</p>
                <p className="font-display font-bold text-2xl">
                  {Number(r.total).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs mt-1">{r.jumlah_transaksi} transaksi</p>
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <span className="font-body font-semibold text-on-surface">Total Semua Metode</span>
              <span className="font-display font-bold text-xl text-primary">
                {grandTotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add Rekap Setoran to Sidebar**

In `frontend/components/shared/Sidebar.tsx`, add `BarChart2` to lucide-react imports and add after Ploting Slot Sapi:

```tsx
{ href: '/depot/keuangan/rekap-setoran', label: 'Rekap Setoran', icon: BarChart2, roles: ['SUPER_ADMIN','KEPALA_DEPOT','KEUANGAN'] },
```

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend
npx tsc --noEmit 2>&1 | head -50
```

Fix any errors.

- [ ] **Step 4: Commit frontend**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/
git commit -m "feat(ui): detail transaksi + pembayaran form + rekap setoran harian"
```

---

## Task 7: Mark T-07 DONE

- [ ] Update `docs/tasks/T-07-manajemen-pembayaran.md` — `**Status:** \`DONE\``
- [ ] Commit: `docs: mark T-07 as DONE`

---

## Acceptance Criteria Checklist

- [ ] `status_bayar` column on transaksi (BELUM_BAYAR/DP/LUNAS, default BELUM_BAYAR)
- [ ] `pembayaran` table: tipe DP/PELUNASAN, metode CASH/TRANSFER_BCA/TRANSFER_LAIN
- [ ] `biaya_tambahan` table: keterangan + jumlah, cascade delete
- [ ] POST /transaksi/{id}/bayar → creates payment, auto-updates status_bayar
- [ ] status_bayar: BELUM_BAYAR (no payments), DP (partial), LUNAS (sisa=0)
- [ ] POST /transaksi/{id}/biaya-tambahan → increments transaksi.total, rechecks status_bayar
- [ ] GET /transaksi/{id}/pembayaran → pembayaran[], total_bayar, sisa_pelunasan
- [ ] GET /laporan/rekap-setoran?tgl= → rekap[{metode, total, jumlah_transaksi}]
- [ ] 7 tests pass; 56 total, 0 regressions
- [ ] Frontend detail: info panel + progress bar + payment history + input form
- [ ] Frontend rekap: date picker + per-metode cards + grand total
- [ ] No_faktur in list clickable → detail page
- [ ] TypeScript: 0 errors
