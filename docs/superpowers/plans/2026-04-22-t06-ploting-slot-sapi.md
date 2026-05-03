# T-06 Ploting Slot Pembeli per Sapi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1 ekor sapi bisa dibeli 1–7 pembeli (slot). Setiap slot merekam pembeli, nama qurban, nominal, tipe qurban, status bayar. Sapi otomatis BOOKED (≥1 slot) atau SOLD (7 slot penuh). Dashboard grid sapi + visual 7 slot.

**Architecture:** Backend Laravel 11 — tabel `slot_sapi` + unique constraint (hewan_id, no_slot), `SlotSapiController` yang update hewan.status otomatis, 7 TDD tests. Frontend Next.js 14 — `/depot/ploting-sapi` grid sapi + SlotPanel sidebar 7 kotak + AssignSlotModal form.

**Tech Stack:** Laravel 11, PostgreSQL, Next.js 14, TypeScript, Tailwind

---

## File Map

### Backend — Created
```
backend/
  database/migrations/XXXX_create_slot_sapi_table.php
  app/Enums/StatusBayarSlot.php
  app/Models/SlotSapi.php
  app/Http/Controllers/SlotSapiController.php
  app/Http/Requests/StoreSlotRequest.php
  tests/Feature/POS/SlotSapiTest.php
```

### Backend — Modified
```
  routes/api.php  ← add slot routes + ploting dashboard route
```

### Frontend — Created
```
frontend/
  app/(dashboard)/depot/ploting-sapi/page.tsx
  app/(dashboard)/depot/ploting-sapi/SlotGrid.tsx
  app/(dashboard)/depot/ploting-sapi/SlotPanel.tsx
  app/(dashboard)/depot/ploting-sapi/AssignSlotModal.tsx
```

### Frontend — Modified
```
  frontend/components/shared/Sidebar.tsx  ← add Ploting Sapi link
```

---

## Task 1: Migration

### Files
- Create: `backend/database/migrations/XXXX_create_slot_sapi_table.php`

- [ ] **Step 1: Generate migration**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan make:migration create_slot_sapi_table
```

- [ ] **Step 2: Fill migration**

Open the generated `*_create_slot_sapi_table.php` and replace `up()` and `down()`:

```php
public function up(): void
{
    Schema::create('slot_sapi', function (Blueprint $table) {
        $table->id();
        $table->foreignId('hewan_id')->constrained('hewan')->cascadeOnDelete();
        $table->unsignedTinyInteger('no_slot');           // 1–7
        $table->foreignId('transaksi_id')->nullable()->constrained('transaksi')->nullOnDelete();
        $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
        $table->string('nama_qurban', 150);               // nama atas nama qurban (bin/binti)
        $table->enum('tipe_qurban', ['SHQ', 'THQ', 'PHQ']);
        $table->unsignedInteger('harga_slot');
        $table->enum('status_bayar', ['DP', 'LUNAS'])->default('DP');
        $table->timestamps();

        $table->unique(['hewan_id', 'no_slot'], 'slot_sapi_hewan_slot_unique');
    });
}
public function down(): void { Schema::dropIfExists('slot_sapi'); }
```

- [ ] **Step 3: Run migration**

```bash
php artisan migrate
```

Expected: `slot_sapi` table created, no errors.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/
git commit -m "feat(db): add slot_sapi table"
```

---

## Task 2: Enum + Model

### Files
- Create: `backend/app/Enums/StatusBayarSlot.php`
- Create: `backend/app/Models/SlotSapi.php`

- [ ] **Step 1: Create StatusBayarSlot enum**

```php
<?php
// backend/app/Enums/StatusBayarSlot.php
namespace App\Enums;

enum StatusBayarSlot: string
{
    case DP    = 'DP';
    case LUNAS = 'LUNAS';
}
```

- [ ] **Step 2: Create SlotSapi model**

```php
<?php
// backend/app/Models/SlotSapi.php
namespace App\Models;

use App\Enums\StatusBayarSlot;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SlotSapi extends Model
{
    protected $table = 'slot_sapi';

    protected $fillable = [
        'hewan_id', 'no_slot', 'transaksi_id', 'customer_id',
        'nama_qurban', 'tipe_qurban', 'harga_slot', 'status_bayar',
    ];

    protected $casts = [
        'no_slot'     => 'integer',
        'harga_slot'  => 'integer',
        'status_bayar'=> StatusBayarSlot::class,
    ];

    public function hewan(): BelongsTo     { return $this->belongsTo(Hewan::class); }
    public function customer(): BelongsTo  { return $this->belongsTo(Customer::class); }
    public function transaksi(): BelongsTo { return $this->belongsTo(Transaksi::class); }
}
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Enums/StatusBayarSlot.php backend/app/Models/SlotSapi.php
git commit -m "feat(pos): StatusBayarSlot enum + SlotSapi model"
```

---

## Task 3: Tests (TDD — write failing first)

### Files
- Create: `backend/tests/Feature/POS/SlotSapiTest.php`

- [ ] **Step 1: Create test file**

```php
<?php
// backend/tests/Feature/POS/SlotSapiTest.php
namespace Tests\Feature\POS;

use App\Enums\StatusHewan;
use App\Models\Customer;
use App\Models\Depot;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\SlotSapi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SlotSapiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Depot $depot;
    private KelasHewan $kelas;
    private Hewan $sapi;
    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin    = User::factory()->superAdmin()->create();
        $this->depot    = Depot::factory()->create();
        $this->kelas    = KelasHewan::create(['kode' => 'A1', 'nama' => 'Kelas A1', 'urutan' => 1]);
        $this->customer = Customer::create(['nama' => 'Budi', 'hp' => '08111']);

        $this->sapi = Hewan::create([
            'depot_id'     => $this->depot->id,
            'kelas_asal_id'=> $this->kelas->id,
            'kelas_jual_id'=> $this->kelas->id,
            'no_hewan'     => '001',
            'jenis'        => 'SAPI',
            'bobot_masuk'  => 300,
            'tgl_masuk'    => '2026-04-01',
            'musim'        => 2026,
            'status'       => 'BOOKED',
        ]);
    }

    private function slotPayload(array $overrides = []): array
    {
        return array_merge([
            'no_slot'     => 1,
            'customer_id' => $this->customer->id,
            'nama_qurban' => 'Ahmad bin Budi',
            'tipe_qurban' => 'SHQ',
            'harga_slot'  => 900000,
            'status_bayar'=> 'DP',
        ], $overrides);
    }

    public function test_list_slots_returns_7_entries(): void
    {
        SlotSapi::create(array_merge($this->slotPayload(), ['hewan_id' => $this->sapi->id]));

        $res = $this->actingAs($this->admin)
            ->getJson("/api/hewan/{$this->sapi->id}/slot");

        $res->assertOk();
        $this->assertCount(7, $res->json('slots'));
    }

    public function test_store_slot_sets_hewan_booked(): void
    {
        $this->sapi->update(['status' => 'AVAILABLE']);

        $this->actingAs($this->admin)
            ->postJson("/api/hewan/{$this->sapi->id}/slot", $this->slotPayload())
            ->assertCreated()
            ->assertJsonPath('slot.no_slot', 1);

        $this->assertDatabaseHas('hewan', ['id' => $this->sapi->id, 'status' => 'BOOKED']);
    }

    public function test_store_all_7_slots_sets_hewan_sold(): void
    {
        foreach (range(1, 7) as $n) {
            $this->actingAs($this->admin)
                ->postJson("/api/hewan/{$this->sapi->id}/slot", $this->slotPayload(['no_slot' => $n]))
                ->assertCreated();
        }

        $this->assertDatabaseHas('hewan', ['id' => $this->sapi->id, 'status' => 'SOLD']);
    }

    public function test_store_duplicate_slot_returns_422(): void
    {
        SlotSapi::create(array_merge($this->slotPayload(), ['hewan_id' => $this->sapi->id]));

        $this->actingAs($this->admin)
            ->postJson("/api/hewan/{$this->sapi->id}/slot", $this->slotPayload())
            ->assertUnprocessable();
    }

    public function test_update_slot(): void
    {
        SlotSapi::create(array_merge($this->slotPayload(), ['hewan_id' => $this->sapi->id]));

        $this->actingAs($this->admin)
            ->putJson("/api/hewan/{$this->sapi->id}/slot/1", [
                'nama_qurban' => 'Siti binti Budi',
                'status_bayar'=> 'LUNAS',
            ])
            ->assertOk()
            ->assertJsonPath('slot.nama_qurban', 'Siti binti Budi')
            ->assertJsonPath('slot.status_bayar', 'LUNAS');
    }

    public function test_destroy_last_slot_sets_hewan_available(): void
    {
        SlotSapi::create(array_merge($this->slotPayload(), ['hewan_id' => $this->sapi->id]));
        $this->sapi->update(['status' => 'BOOKED']);

        $this->actingAs($this->admin)
            ->deleteJson("/api/hewan/{$this->sapi->id}/slot/1")
            ->assertOk();

        $this->assertDatabaseHas('hewan', ['id' => $this->sapi->id, 'status' => 'AVAILABLE']);
        $this->assertDatabaseMissing('slot_sapi', ['hewan_id' => $this->sapi->id, 'no_slot' => 1]);
    }

    public function test_destroy_partial_slot_stays_booked(): void
    {
        foreach ([1, 2] as $n) {
            SlotSapi::create(array_merge($this->slotPayload(['no_slot' => $n]), ['hewan_id' => $this->sapi->id]));
        }
        $this->sapi->update(['status' => 'BOOKED']);

        $this->actingAs($this->admin)
            ->deleteJson("/api/hewan/{$this->sapi->id}/slot/1")
            ->assertOk();

        $this->assertDatabaseHas('hewan', ['id' => $this->sapi->id, 'status' => 'BOOKED']);
    }

    public function test_ploting_dashboard(): void
    {
        SlotSapi::create(array_merge($this->slotPayload(), ['hewan_id' => $this->sapi->id]));

        $this->actingAs($this->admin)
            ->getJson("/api/hewan/sapi/ploting?depot={$this->depot->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'no_hewan', 'slot_terisi', 'slot_total']]]);
    }
}
```

- [ ] **Step 2: Run — confirm FAIL**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan test tests/Feature/POS/SlotSapiTest.php
```

Expected: all FAIL with 404 (routes don't exist).

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/tests/Feature/POS/SlotSapiTest.php
git commit -m "test(pos): 7 failing SlotSapiTest — TDD red phase"
```

---

## Task 4: StoreSlotRequest + SlotSapiController + Routes

### Files
- Create: `backend/app/Http/Requests/StoreSlotRequest.php`
- Create: `backend/app/Http/Controllers/SlotSapiController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create StoreSlotRequest**

```php
<?php
// backend/app/Http/Requests/StoreSlotRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSlotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'no_slot'     => ['required', 'integer', 'min:1', 'max:7'],
            'customer_id' => ['required', 'exists:customers,id'],
            'transaksi_id'=> ['nullable', 'exists:transaksi,id'],
            'nama_qurban' => ['required', 'string', 'max:150'],
            'tipe_qurban' => ['required', 'in:SHQ,THQ,PHQ'],
            'harga_slot'  => ['required', 'integer', 'min:0'],
            'status_bayar'=> ['required', 'in:DP,LUNAS'],
        ];
    }
}
```

- [ ] **Step 2: Create SlotSapiController**

```php
<?php
// backend/app/Http/Controllers/SlotSapiController.php
namespace App\Http\Controllers;

use App\Enums\StatusHewan;
use App\Http\Requests\StoreSlotRequest;
use App\Models\Hewan;
use App\Models\SlotSapi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SlotSapiController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $sapi = Hewan::with('kelasJual:id,kode')
            ->where('jenis', 'SAPI')
            ->when($request->depot, fn($q) => $q->where('depot_id', $request->depot))
            ->whereNotIn('status', ['MATI', 'DELIVERED'])
            ->orderBy('no_hewan')
            ->get()
            ->map(function (Hewan $h) {
                $terisi = SlotSapi::where('hewan_id', $h->id)->count();
                return array_merge($h->toArray(), [
                    'slot_terisi' => $terisi,
                    'slot_total'  => 7,
                ]);
            });

        return response()->json(['data' => $sapi]);
    }

    public function index(Hewan $hewan): JsonResponse
    {
        $filled = SlotSapi::with('customer:id,nama,hp')
            ->where('hewan_id', $hewan->id)
            ->get()
            ->keyBy('no_slot');

        $slots = collect(range(1, 7))->map(fn($n) => $filled->has($n)
            ? $filled->get($n)
            : ['no_slot' => $n, 'status' => 'KOSONG']
        );

        return response()->json([
            'hewan' => $hewan->only(['id', 'no_hewan', 'jenis', 'status', 'bobot_masuk']),
            'slots' => $slots,
        ]);
    }

    public function store(StoreSlotRequest $request, Hewan $hewan): JsonResponse
    {
        abort_if($hewan->jenis !== 'SAPI', 422, 'Slot hanya untuk SAPI.');

        $exists = SlotSapi::where('hewan_id', $hewan->id)
            ->where('no_slot', $request->no_slot)
            ->exists();

        abort_if($exists, 422, "Slot {$request->no_slot} sudah terisi.");

        $slot = SlotSapi::create(array_merge(
            $request->validated(),
            ['hewan_id' => $hewan->id]
        ));

        $this->syncHewanStatus($hewan);

        return response()->json(['slot' => $slot->load('customer:id,nama,hp')], 201);
    }

    public function update(Request $request, Hewan $hewan, int $noSlot): JsonResponse
    {
        $slot = SlotSapi::where('hewan_id', $hewan->id)
            ->where('no_slot', $noSlot)
            ->firstOrFail();

        $data = $request->validate([
            'customer_id' => ['sometimes', 'exists:customers,id'],
            'nama_qurban' => ['sometimes', 'string', 'max:150'],
            'tipe_qurban' => ['sometimes', 'in:SHQ,THQ,PHQ'],
            'harga_slot'  => ['sometimes', 'integer', 'min:0'],
            'status_bayar'=> ['sometimes', 'in:DP,LUNAS'],
        ]);

        $slot->update($data);

        return response()->json(['slot' => $slot->fresh()->load('customer:id,nama,hp')]);
    }

    public function destroy(Hewan $hewan, int $noSlot): JsonResponse
    {
        $slot = SlotSapi::where('hewan_id', $hewan->id)
            ->where('no_slot', $noSlot)
            ->firstOrFail();

        $slot->delete();

        $this->syncHewanStatus($hewan);

        return response()->json(['message' => "Slot {$noSlot} berhasil dikosongkan."]);
    }

    private function syncHewanStatus(Hewan $hewan): void
    {
        $count = SlotSapi::where('hewan_id', $hewan->id)->count();

        $status = match(true) {
            $count >= 7 => StatusHewan::SOLD->value,
            $count > 0  => StatusHewan::BOOKED->value,
            default     => StatusHewan::AVAILABLE->value,
        };

        $hewan->update(['status' => $status]);
    }
}
```

- [ ] **Step 3: Add routes to api.php**

Inside the `auth:sanctum` group, AFTER the existing hewan routes (but BEFORE `hewan/{hewan}` wildcard — check ordering), add:

```php
use App\Http\Controllers\SlotSapiController;

// Slot Sapi — dashboard static route BEFORE {hewan} wildcard
Route::get('hewan/sapi/ploting', [SlotSapiController::class, 'dashboard']);

// Slot CRUD (under hewan/{hewan})
Route::get('hewan/{hewan}/slot',              [SlotSapiController::class, 'index']);
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_ANGGOTA')->group(function () {
    Route::post('hewan/{hewan}/slot',          [SlotSapiController::class, 'store']);
    Route::put('hewan/{hewan}/slot/{noSlot}',  [SlotSapiController::class, 'update']);
    Route::delete('hewan/{hewan}/slot/{noSlot}',[SlotSapiController::class, 'destroy']);
});
```

IMPORTANT: `hewan/sapi/ploting` has 3 path segments. `hewan/{hewan}` has 2 segments. No conflict — Laravel matches by segment count.

- [ ] **Step 4: Run SlotSapiTest — confirm PASS**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan test tests/Feature/POS/SlotSapiTest.php
```

Expected: 7 tests pass.

- [ ] **Step 5: Run full suite — no regression**

```bash
php artisan test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Requests/StoreSlotRequest.php backend/app/Http/Controllers/SlotSapiController.php backend/routes/api.php
git commit -m "feat(pos): SlotSapiController + 7 tests passing"
```

---

## Task 5: Frontend — Ploting Sapi page

### Files
- Create: `frontend/app/(dashboard)/depot/ploting-sapi/SlotGrid.tsx`
- Create: `frontend/app/(dashboard)/depot/ploting-sapi/AssignSlotModal.tsx`
- Create: `frontend/app/(dashboard)/depot/ploting-sapi/SlotPanel.tsx`
- Create: `frontend/app/(dashboard)/depot/ploting-sapi/page.tsx`

- [ ] **Step 1: Create SlotGrid component**

```tsx
// frontend/app/(dashboard)/depot/ploting-sapi/SlotGrid.tsx
import { cn } from '@/lib/utils'

interface SlotEntry {
  no_slot: number
  status?: 'KOSONG'
  nama_qurban?: string
  tipe_qurban?: string
  status_bayar?: string
  customer?: { nama: string; hp: string } | null
}

interface Props {
  slots: SlotEntry[]
  onSlotClick: (noSlot: number) => void
  compact?: boolean
}

const BAYAR_COLOR: Record<string, string> = {
  LUNAS: 'bg-green-100 border-green-400 text-green-800',
  DP:    'bg-yellow-50 border-yellow-300 text-yellow-800',
}

export function SlotGrid({ slots, onSlotClick, compact }: Props) {
  return (
    <div className={cn('grid gap-1.5', compact ? 'grid-cols-7' : 'grid-cols-7')}>
      {Array.from({ length: 7 }, (_, i) => {
        const slot = slots.find(s => s.no_slot === i + 1)
        const filled = slot && slot.status !== 'KOSONG'

        return (
          <button
            key={i + 1}
            onClick={() => onSlotClick(i + 1)}
            title={filled ? `Slot ${i + 1}: ${slot?.customer?.nama ?? ''}` : `Slot ${i + 1}: Kosong`}
            className={cn(
              'rounded-lg border-2 transition-all',
              compact ? 'h-5' : 'h-10 flex items-center justify-center text-xs font-body',
              filled
                ? BAYAR_COLOR[slot?.status_bayar ?? 'DP']
                : 'bg-surface-high border-surface-highest text-on-surface-variant hover:border-primary/50'
            )}
          >
            {!compact && (filled ? slot?.no_slot : <span className="text-on-surface-variant">{i + 1}</span>)}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create AssignSlotModal**

```tsx
// frontend/app/(dashboard)/depot/ploting-sapi/AssignSlotModal.tsx
'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'

interface Customer { id: number; nama: string; hp: string }

interface Props {
  hewanId: number
  noSlot: number
  hargaDefault: number
  onDone: () => void
  onClose: () => void
}

export function AssignSlotModal({ hewanId, noSlot, hargaDefault, onDone, onClose }: Props) {
  const [nama, setNama]           = useState('')
  const [hp, setHp]               = useState('')
  const [namaQurban, setNamaQurban] = useState('')
  const [tipe, setTipe]           = useState('SHQ')
  const [harga, setHarga]         = useState(String(hargaDefault))
  const [statusBayar, setStatus]  = useState<'DP' | 'LUNAS'>('DP')
  const [suggestions, setSuggestions] = useState<Customer[]>([])
  const [showSug, setShowSug]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const selectedCustomerId            = useRef<number | null>(null)
  const debounce                      = useRef<ReturnType<typeof setTimeout>>()

  function searchCustomer(q: string) {
    selectedCustomerId.current = null
    clearTimeout(debounce.current)
    if (q.length < 2) { setSuggestions([]); setShowSug(false); return }
    debounce.current = setTimeout(async () => {
      const r = await api.get(`/api/customer?q=${encodeURIComponent(q)}`)
      setSuggestions(r.data.data ?? [])
      setShowSug(true)
    }, 300)
  }

  function selectCustomer(c: Customer) {
    selectedCustomerId.current = c.id
    setNama(c.nama)
    setHp(c.hp ?? '')
    setSuggestions([])
    setShowSug(false)
  }

  async function submit() {
    if (!nama.trim() || !namaQurban.trim()) return
    setSaving(true)
    try {
      let customerId = selectedCustomerId.current
      if (!customerId) {
        const res = await api.post('/api/customer', { nama, hp })
        customerId = res.data.customer.id as number
      }
      await api.post(`/api/hewan/${hewanId}/slot`, {
        no_slot:     noSlot,
        customer_id: customerId,
        nama_qurban: namaQurban,
        tipe_qurban: tipe,
        harga_slot:  parseInt(harga) || 0,
        status_bayar: statusBayar,
      })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">Isi Slot {noSlot}</h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          {/* Nama pembeli dengan autocomplete */}
          <div className="relative">
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Nama Pembeli *</label>
            <Input
              value={nama}
              onChange={e => { setNama(e.target.value); searchCustomer(e.target.value) }}
              onBlur={() => setTimeout(() => setShowSug(false), 150)}
              placeholder="Cari atau isi baru..."
            />
            {showSug && suggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-surface-lowest border border-surface-high rounded-xl shadow-card mt-1 max-h-40 overflow-y-auto">
                {suggestions.map(c => (
                  <button
                    key={c.id}
                    onMouseDown={() => selectCustomer(c)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-high text-sm font-body"
                  >
                    <span className="font-medium text-on-surface">{c.nama}</span>
                    <span className="text-on-surface-variant ml-2 text-xs">{c.hp}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">No HP</label>
            <Input value={hp} onChange={e => setHp(e.target.value)} placeholder="08..." />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Nama Qurban (bin/binti) *</label>
            <Input value={namaQurban} onChange={e => setNamaQurban(e.target.value)} placeholder="Ahmad bin Budi..." />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Tipe Qurban</label>
            <div className="flex gap-2">
              {['SHQ', 'THQ', 'PHQ'].map(t => (
                <button
                  key={t}
                  onClick={() => setTipe(t)}
                  className={`px-3 py-1 rounded-lg border-2 text-xs font-body transition-colors ${
                    tipe === t ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Harga Slot (Rp)</label>
            <Input
              type="number"
              value={harga}
              onChange={e => setHarga(e.target.value)}
              placeholder="900000"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Status Bayar</label>
            <div className="flex gap-2">
              {(['DP', 'LUNAS'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-4 py-1 rounded-lg border-2 text-xs font-body transition-colors ${
                    statusBayar === s ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button
            onClick={submit}
            loading={saving}
            disabled={!nama.trim() || !namaQurban.trim()}
          >
            Simpan
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create SlotPanel**

```tsx
// frontend/app/(dashboard)/depot/ploting-sapi/SlotPanel.tsx
'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SlotGrid } from './SlotGrid'
import api from '@/lib/api'

interface SlotEntry {
  no_slot: number
  status?: 'KOSONG'
  nama_qurban?: string
  tipe_qurban?: string
  status_bayar?: string
  harga_slot?: number
  customer?: { nama: string; hp: string } | null
}

interface SapiData {
  id: number
  no_hewan: string
  status: string
  bobot_masuk: string
  kelas_jual?: { kode: string } | null
}

interface Props {
  sapi: SapiData
  slots: SlotEntry[]
  onAssign: (noSlot: number) => void
  onDelete: (noSlot: number) => void
  onClose: () => void
}

const BAYAR_LABEL: Record<string, string> = { DP: 'DP', LUNAS: 'Lunas' }
const BAYAR_COLOR: Record<string, string> = {
  LUNAS: 'text-green-700',
  DP:    'text-yellow-700',
}

export function SlotPanel({ sapi, slots, onAssign, onDelete, onClose }: Props) {
  const filled = slots.filter(s => s.status !== 'KOSONG')
  const totalTerkumpul = filled.reduce((sum, s) => sum + (s.harga_slot ?? 0), 0)

  return (
    <Card className="w-80 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display font-semibold text-on-surface">Sapi #{sapi.no_hewan}</h3>
          <p className="text-xs text-on-surface-variant font-body">
            {sapi.kelas_jual?.kode} · {sapi.bobot_masuk} kg · {filled.length}/7 slot
          </p>
        </div>
        <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-surface-high rounded-full mb-4">
        <div
          className="h-1.5 rounded-full bg-primary transition-all"
          style={{ width: `${(filled.length / 7) * 100}%` }}
        />
      </div>

      {filled.length === 7 && (
        <div className="mb-3 px-3 py-1.5 bg-green-50 border border-green-300 rounded-xl text-xs font-body font-semibold text-green-800 text-center">
          PENUH
        </div>
      )}

      <p className="text-xs text-on-surface-variant font-body mb-3">
        Terkumpul: {totalTerkumpul.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
      </p>

      {/* Slot list */}
      <div className="space-y-2">
        {Array.from({ length: 7 }, (_, i) => {
          const slot = slots.find(s => s.no_slot === i + 1)
          const filled = slot && slot.status !== 'KOSONG'

          return (
            <div
              key={i + 1}
              className="flex items-center justify-between py-2 border-b border-surface-high last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-surface-high text-xs font-body font-semibold text-on-surface-variant flex items-center justify-center">
                  {i + 1}
                </span>
                {filled ? (
                  <div>
                    <p className="text-sm font-body font-medium text-on-surface">{slot?.customer?.nama}</p>
                    <p className="text-xs text-on-surface-variant">{slot?.nama_qurban} · {slot?.tipe_qurban}</p>
                    <p className={`text-xs font-body font-medium ${BAYAR_COLOR[slot?.status_bayar ?? 'DP']}`}>
                      {slot?.harga_slot?.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                      {' · '}{BAYAR_LABEL[slot?.status_bayar ?? 'DP']}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-on-surface-variant italic">Kosong</span>
                )}
              </div>
              <div className="flex gap-1">
                {!filled && (
                  <button onClick={() => onAssign(i + 1)} className="text-xs text-primary hover:underline">
                    Isi
                  </button>
                )}
                {filled && (
                  <button onClick={() => onDelete(i + 1)} className="text-xs text-red-600 hover:underline">
                    Hapus
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
```

- [ ] **Step 4: Create main ploting-sapi page**

```tsx
// frontend/app/(dashboard)/depot/ploting-sapi/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { SlotGrid } from './SlotGrid'
import { SlotPanel } from './SlotPanel'
import { AssignSlotModal } from './AssignSlotModal'
import api from '@/lib/api'

interface SapiData {
  id: number
  no_hewan: string
  status: string
  bobot_masuk: string
  kelas_jual?: { kode: string } | null
  slot_terisi: number
  slot_total: number
}

interface SlotEntry {
  no_slot: number
  status?: 'KOSONG'
  nama_qurban?: string
  tipe_qurban?: string
  status_bayar?: string
  harga_slot?: number
  customer?: { nama: string; hp: string } | null
}

export default function PlotingSapiPage() {
  const [sapiList, setSapiList]   = useState<SapiData[]>([])
  const [loading, setLoading]     = useState(true)
  const [selectedSapi, setSelected] = useState<SapiData | null>(null)
  const [slots, setSlots]         = useState<SlotEntry[]>([])
  const [assignSlot, setAssignSlot] = useState<number | null>(null)

  const loadSapi = useCallback(() => {
    setLoading(true)
    api.get('/api/hewan/sapi/ploting')
      .then(r => setSapiList(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadSapi() }, [loadSapi])

  async function selectSapi(sapi: SapiData) {
    setSelected(sapi)
    const r = await api.get(`/api/hewan/${sapi.id}/slot`)
    setSlots(r.data.slots ?? [])
  }

  async function handleDelete(noSlot: number) {
    if (!selectedSapi) return
    if (!confirm(`Hapus slot ${noSlot}?`)) return
    await api.delete(`/api/hewan/${selectedSapi.id}/slot/${noSlot}`)
    // reload slots + sapi list
    const [slotRes] = await Promise.all([
      api.get(`/api/hewan/${selectedSapi.id}/slot`),
      loadSapi(),
    ])
    setSlots(slotRes.data.slots ?? [])
  }

  function handleAssignDone() {
    setAssignSlot(null)
    if (selectedSapi) selectSapi(selectedSapi)
    loadSapi()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Ploting Slot Sapi</h1>
          <p className="text-sm text-on-surface-variant mt-1">1 sapi = 7 slot pembeli</p>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Grid sapi */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <p className="text-sm text-on-surface-variant py-8 text-center">Memuat...</p>
          ) : sapiList.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-8 text-center">Belum ada sapi di depot ini</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {sapiList.map(sapi => (
                <button
                  key={sapi.id}
                  onClick={() => selectSapi(sapi)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedSapi?.id === sapi.id
                      ? 'border-primary bg-surface-high shadow-card'
                      : 'border-surface-high hover:border-primary/50 bg-surface-lowest'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-bold text-sm text-on-surface">#{sapi.no_hewan}</span>
                    {sapi.slot_terisi === 7 && (
                      <span className="text-xs font-body font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                        PENUH
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-on-surface-variant font-body mb-2">
                    {sapi.kelas_jual?.kode ?? '—'} · {sapi.bobot_masuk} kg
                  </p>

                  {/* Mini slot bar */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: 7 }, (_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-2 rounded-sm ${
                          i < sapi.slot_terisi ? 'bg-primary' : 'bg-surface-high'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 font-body">
                    {sapi.slot_terisi}/{sapi.slot_total} slot
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Slot panel */}
        {selectedSapi && (
          <SlotPanel
            sapi={selectedSapi}
            slots={slots}
            onAssign={noSlot => setAssignSlot(noSlot)}
            onDelete={handleDelete}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      {/* Assign modal */}
      {assignSlot !== null && selectedSapi && (
        <AssignSlotModal
          hewanId={selectedSapi.id}
          noSlot={assignSlot}
          hargaDefault={0}
          onDone={handleAssignDone}
          onClose={() => setAssignSlot(null)}
        />
      )}
    </div>
  )
}
```

---

## Task 6: Sidebar + TypeScript check + Commit

### Files
- Modify: `frontend/components/shared/Sidebar.tsx`

- [ ] **Step 1: Add Layers icon + nav item**

In `frontend/components/shared/Sidebar.tsx`:

1. Add `Layers` to lucide-react imports
2. Add this nav item AFTER the Transaksi entry:

```tsx
{ href: '/depot/ploting-sapi', label: 'Ploting Slot Sapi', icon: Layers, roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_ANGGOTA'] },
```

- [ ] **Step 2: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend
npx tsc --noEmit 2>&1 | head -50
```

Fix any errors.

- [ ] **Step 3: Commit frontend**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/
git commit -m "feat(ui): ploting slot sapi — grid sapi, slot panel, assign slot modal"
```

---

## Task 7: Mark T-06 DONE

- [ ] **Step 1: Update task file**

`docs/tasks/T-06-ploting-slot-sapi.md` — change `**Status:** \`TODO\`` to `**Status:** \`DONE\``

- [ ] **Step 2: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-06-ploting-slot-sapi.md
git commit -m "docs: mark T-06 as DONE"
```

---

## Acceptance Criteria Checklist

- [ ] `slot_sapi` table: unique (hewan_id, no_slot), FK→hewan cascade, FK→customers restrict
- [ ] `GET /api/hewan/{hewan}/slot` always returns 7 entries (filled + KOSONG placeholders)
- [ ] `POST /api/hewan/{hewan}/slot` creates slot, 422 if duplicate, syncs hewan.status
- [ ] `PUT /api/hewan/{hewan}/slot/{noSlot}` updates slot
- [ ] `DELETE /api/hewan/{hewan}/slot/{noSlot}` deletes slot, syncs hewan.status
- [ ] `GET /api/hewan/sapi/ploting` returns sapi with slot_terisi + slot_total
- [ ] hewan.status → BOOKED (≥1 slot), SOLD (7 slots), AVAILABLE (0 slots)
- [ ] 7 backend tests pass; full suite no regression
- [ ] Frontend grid shows all sapi with 7-segment mini slot bar
- [ ] Click sapi → SlotPanel shows 7 slots with filled details + Isi/Hapus actions
- [ ] AssignSlotModal: customer autocomplete, nama_qurban, tipe, harga, status_bayar
- [ ] Badge PENUH when 7/7
- [ ] TypeScript: 0 errors
