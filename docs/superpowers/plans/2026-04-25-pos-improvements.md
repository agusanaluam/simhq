# POS Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix kelas filter bug in POS step 2, add full address fields (kelurahan/kecamatan/kode_pos), redesign StepReview with CS-filtered dropdown, auto-teller, sales text input, and payment method/scheme capture.

**Architecture:** Two new migrations (customers.kode_pos, transaksi.sales_nama + rencana_pelunasan). Backend: UserController gains role filter, CustomerController + StoreTransaksiRequest gain new fields. Frontend: StepPilihHewan filters by kelas, StepDataPembeli gains 3 address fields, StepReview fully redesigned, page.tsx updated with new FormState + split submit (POST transaksi then POST bayar).

**Tech Stack:** Laravel 11, PostgreSQL, Next.js 14, TypeScript, Tailwind CSS, NextAuth session.

---

## File Map

| Action | File |
|--------|------|
| Create | `backend/database/migrations/2026_04_25_010000_add_kode_pos_to_customers.php` |
| Create | `backend/database/migrations/2026_04_25_010001_add_sales_nama_rencana_to_transaksi.php` |
| Modify | `backend/app/Models/Customer.php` |
| Modify | `backend/app/Models/Transaksi.php` |
| Modify | `backend/app/Http/Controllers/UserController.php` |
| Modify | `backend/app/Http/Controllers/CustomerController.php` |
| Modify | `backend/app/Http/Requests/StoreTransaksiRequest.php` |
| Create | `backend/tests/Feature/POS/POSImprovementsTest.php` |
| Modify | `frontend/app/(dashboard)/depot/pos/StepPilihHewan.tsx` |
| Modify | `frontend/app/(dashboard)/depot/pos/StepDataPembeli.tsx` |
| Modify | `frontend/app/(dashboard)/depot/pos/StepReview.tsx` |
| Modify | `frontend/app/(dashboard)/depot/pos/page.tsx` |

---

## Task 1: Migrations

**Files:**
- Create: `backend/database/migrations/2026_04_25_010000_add_kode_pos_to_customers.php`
- Create: `backend/database/migrations/2026_04_25_010001_add_sales_nama_rencana_to_transaksi.php`

- [ ] **Step 1: Create kode_pos migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('kode_pos', 10)->nullable()->after('kota');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('kode_pos');
        });
    }
};
```

- [ ] **Step 2: Create transaksi migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->string('sales_nama', 100)->nullable()->after('sales_id');
            $table->date('rencana_pelunasan')->nullable()->after('sales_nama');
        });
    }

    public function down(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->dropColumn(['sales_nama', 'rencana_pelunasan']);
        });
    }
};
```

- [ ] **Step 3: Run migrations**

```bash
php artisan migrate
```

Expected: both migrations run successfully.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/2026_04_25_010000_add_kode_pos_to_customers.php \
        database/migrations/2026_04_25_010001_add_sales_nama_rencana_to_transaksi.php
git commit -m "feat(pos): add kode_pos to customers; add sales_nama + rencana_pelunasan to transaksi"
```

---

## Task 2: Write Failing Backend Tests (TDD)

**Files:**
- Create: `backend/tests/Feature/POS/POSImprovementsTest.php`

- [ ] **Step 1: Create test file**

```php
<?php
namespace Tests\Feature\POS;

use App\Models\Customer;
use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class POSImprovementsTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;
    private KelasHewan $kelas;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->depot      = Depot::factory()->create();
        $this->kelas      = KelasHewan::create(['kode' => 'A', 'nama' => 'A', 'urutan' => 4]);
    }

    public function test_users_index_filters_by_role(): void
    {
        $cs    = User::factory()->create(['role' => 'CS_KETUA',      'name' => 'CS User']);
        $admin = User::factory()->create(['role' => 'ADMIN_ANGGOTA', 'name' => 'Admin User']);

        $res = $this->actingAs($this->superAdmin)
            ->getJson('/api/users?role=CS_KETUA,CS_ANGGOTA')
            ->assertOk();

        $ids = collect($res->json('data'))->pluck('id')->toArray();
        $this->assertContains($cs->id, $ids);
        $this->assertNotContains($admin->id, $ids);
    }

    public function test_customer_store_accepts_kode_pos(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/customer', [
                'nama'      => 'Budi',
                'hp'        => '081234567890',
                'kode_pos'  => '12345',
            ])
            ->assertCreated()
            ->assertJsonPath('customer.kode_pos', '12345');
    }

    public function test_transaksi_store_accepts_sales_nama_and_rencana_pelunasan(): void
    {
        $customer = Customer::create(['nama' => 'Test', 'hp' => '081234567890']);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/transaksi', [
                'depot_id'           => $this->depot->id,
                'customer_id'        => $customer->id,
                'tipe_qurban'        => 'SHQ',
                'jenis'              => 'SAPI',
                'kelas_id'           => $this->kelas->id,
                'musim'              => 2026,
                'sales_nama'         => 'Andi Sales',
                'rencana_pelunasan'  => '2026-06-01',
            ])
            ->assertCreated()
            ->assertJsonPath('transaksi.sales_nama', 'Andi Sales');
    }
}
```

- [ ] **Step 2: Run tests — confirm they FAIL**

```bash
php artisan test tests/Feature/POS/POSImprovementsTest.php --no-coverage
```

Expected: 3 failures (columns missing / fields not accepted).

- [ ] **Step 3: Commit**

```bash
git add tests/Feature/POS/POSImprovementsTest.php
git commit -m "test(pos): add failing POSImprovementsTest (TDD)"
```

---

## Task 3: Backend Implementation

**Files:**
- Modify: `backend/app/Models/Customer.php`
- Modify: `backend/app/Models/Transaksi.php`
- Modify: `backend/app/Http/Controllers/UserController.php`
- Modify: `backend/app/Http/Controllers/CustomerController.php`
- Modify: `backend/app/Http/Requests/StoreTransaksiRequest.php`

- [ ] **Step 1: Update Customer model fillable**

In `backend/app/Models/Customer.php`, find:
```php
    protected $fillable = ['nama', 'hp', 'alamat', 'kelurahan', 'kecamatan', 'kota'];
```
Replace with:
```php
    protected $fillable = ['nama', 'hp', 'alamat', 'kelurahan', 'kecamatan', 'kota', 'kode_pos'];
```

- [ ] **Step 2: Update Transaksi model**

In `backend/app/Models/Transaksi.php`:

Read the file first. Find the `$fillable` line that includes `'sales_id'`. Add `'sales_nama'` and `'rencana_pelunasan'` right after `'sales_id'` in the same array. The result should look like:
```php
        'cs_id', 'teller_id', 'sales_id', 'sales_nama', 'rencana_pelunasan', 'yayasan_id',
```

Find the `$casts` array and add:
```php
        'rencana_pelunasan' => 'date',
```
alongside the other cast entries.

- [ ] **Step 3: Update UserController — add Request + role filter**

Replace entire `index()` method in `backend/app/Http/Controllers/UserController.php`:

```php
    public function index(Request $request): JsonResponse
    {
        $users = User::with('depot:id,nama')
            ->when($request->role, fn($q) => $q->whereIn('role', explode(',', $request->role)))
            ->orderBy('name')
            ->paginate(50);

        return response()->json($users);
    }
```

Add `use Illuminate\Http\Request;` to imports if not present (check top of file).

- [ ] **Step 4: Update CustomerController — add kode_pos validation**

In `backend/app/Http/Controllers/CustomerController.php`, find in `store()`:
```php
            'kota'      => ['nullable', 'string', 'max:100'],
```
Add after it:
```php
            'kode_pos'  => ['nullable', 'string', 'max:10'],
```

- [ ] **Step 5: Update StoreTransaksiRequest — add new fields**

In `backend/app/Http/Requests/StoreTransaksiRequest.php`, find:
```php
            'catatan'     => ['nullable', 'string', 'max:500'],
```
Add after it:
```php
            'sales_nama'        => ['nullable', 'string', 'max:100'],
            'rencana_pelunasan' => ['nullable', 'date'],
```

- [ ] **Step 6: Run POSImprovementsTest — all 3 must PASS**

```bash
php artisan test tests/Feature/POS/POSImprovementsTest.php --no-coverage
```

Expected: 3 passed.

- [ ] **Step 7: Run full test suite — no regressions**

```bash
php artisan test --no-coverage
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add app/Models/Customer.php \
        app/Models/Transaksi.php \
        app/Http/Controllers/UserController.php \
        app/Http/Controllers/CustomerController.php \
        app/Http/Requests/StoreTransaksiRequest.php
git commit -m "feat(pos): role filter for users; kode_pos for customer; sales_nama+rencana for transaksi"
```

---

## Task 4: StepPilihHewan — kelas filter

**Files:**
- Modify: `frontend/app/(dashboard)/depot/pos/StepPilihHewan.tsx`

- [ ] **Step 1: Update Props interface — add kelasId**

Find:
```tsx
interface Props {
  jenis: string
  hewanId: number | null
  preorder: boolean
  onNext: (data: { hewanId: number | null; preorder: boolean; hewanNo: string | null }) => void
  onBack: () => void
}
```
Replace with:
```tsx
interface Props {
  jenis: string
  kelasId: number | null
  hewanId: number | null
  preorder: boolean
  onNext: (data: { hewanId: number | null; preorder: boolean; hewanNo: string | null }) => void
  onBack: () => void
}
```

- [ ] **Step 2: Update function signature**

Find:
```tsx
export function StepPilihHewan({ jenis, hewanId: initHewanId, preorder: initPreorder, onNext, onBack }: Props) {
```
Replace with:
```tsx
export function StepPilihHewan({ jenis, kelasId, hewanId: initHewanId, preorder: initPreorder, onNext, onBack }: Props) {
```

- [ ] **Step 3: Update useEffect fetch — add kelas filter**

Find:
```tsx
  useEffect(() => {
    api.get(`/api/hewan?status=AVAILABLE&jenis=${jenis}`)
      .then(r => setHewan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [jenis])
```
Replace with:
```tsx
  useEffect(() => {
    const params = new URLSearchParams({ status: 'AVAILABLE', jenis })
    if (kelasId) params.set('kelas', String(kelasId))
    api.get(`/api/hewan?${params}`)
      .then(r => setHewan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [jenis, kelasId])
```

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/USER/projects/simhq add "frontend/app/(dashboard)/depot/pos/StepPilihHewan.tsx"
git -C C:/Users/USER/projects/simhq commit -m "fix(pos): filter hewan by kelas in step 2"
```

---

## Task 5: StepDataPembeli — add kelurahan, kecamatan, kode_pos

**Files:**
- Modify: `frontend/app/(dashboard)/depot/pos/StepDataPembeli.tsx`

- [ ] **Step 1: Update Customer interface**

Find:
```tsx
interface Customer { id: number; nama: string; hp: string; alamat: string | null; kota: string | null }
```
Replace with:
```tsx
interface Customer { id: number; nama: string; hp: string; alamat: string | null; kelurahan: string | null; kecamatan: string | null; kode_pos: string | null; kota: string | null }
```

- [ ] **Step 2: Update PembeliData interface**

Find:
```tsx
interface PembeliData {
  customerId: number | null
  nama: string
  hp: string
  alamat: string
  kota: string
}
```
Replace with:
```tsx
interface PembeliData {
  customerId: number | null
  nama: string
  hp: string
  alamat: string
  kelurahan: string
  kecamatan: string
  kode_pos: string
  kota: string
}
```

- [ ] **Step 3: Update Props onNext signature**

Find:
```tsx
  onNext: (data: PembeliData & { customerId: number }) => void
```
This stays the same — `PembeliData` now includes the new fields.

- [ ] **Step 4: Add new state variables**

Inside `StepDataPembeli`, after `const [kota, setKota] = useState(initData.kota)`, add:
```tsx
  const [kelurahan, setKelurahan] = useState(initData.kelurahan ?? '')
  const [kecamatan, setKecamatan] = useState(initData.kecamatan ?? '')
  const [kode_pos,  setKodePOS]   = useState(initData.kode_pos ?? '')
```

- [ ] **Step 5: Update selectCustomer — populate new fields**

Find:
```tsx
  function selectCustomer(c: Customer) {
    selectedCustomerId.current = c.id
    setNama(c.nama)
    setHp(c.hp ?? '')
    setAlamat(c.alamat ?? '')
    setKota(c.kota ?? '')
    setSuggestions([])
    setShowSug(false)
  }
```
Replace with:
```tsx
  function selectCustomer(c: Customer) {
    selectedCustomerId.current = c.id
    setNama(c.nama)
    setHp(c.hp ?? '')
    setAlamat(c.alamat ?? '')
    setKelurahan(c.kelurahan ?? '')
    setKecamatan(c.kecamatan ?? '')
    setKodePOS(c.kode_pos ?? '')
    setKota(c.kota ?? '')
    setSuggestions([])
    setShowSug(false)
  }
```

- [ ] **Step 6: Update handleNext — include new fields**

Find:
```tsx
      if (!customerId) {
        const res = await api.post('/api/customer', { nama, hp, alamat, kota })
        customerId = res.data.customer.id as number
      }
      onNext({ customerId, nama, hp, alamat, kota })
```
Replace with:
```tsx
      if (!customerId) {
        const res = await api.post('/api/customer', { nama, hp, alamat, kelurahan, kecamatan, kode_pos, kota })
        customerId = res.data.customer.id as number
      }
      onNext({ customerId, nama, hp, alamat, kelurahan, kecamatan, kode_pos, kota })
```

- [ ] **Step 7: Add 3 new Input fields in JSX**

Find the existing alamat input block:
```tsx
      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-1">Alamat</label>
        <Input value={alamat} onChange={e => setAlamat(e.target.value)} placeholder="Jalan, RT/RW..." />
      </div>

      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-1">Kota</label>
        <Input value={kota} onChange={e => setKota(e.target.value)} placeholder="Nama kota..." />
      </div>
```
Replace with:
```tsx
      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-1">Alamat</label>
        <Input value={alamat} onChange={e => setAlamat(e.target.value)} placeholder="Jalan, RT/RW..." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Kelurahan</label>
          <Input value={kelurahan} onChange={e => setKelurahan(e.target.value)} placeholder="Kelurahan..." />
        </div>
        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Kecamatan</label>
          <Input value={kecamatan} onChange={e => setKecamatan(e.target.value)} placeholder="Kecamatan..." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Kode Pos</label>
          <Input value={kode_pos} onChange={e => setKodePOS(e.target.value)} placeholder="12345" />
        </div>
        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Kota</label>
          <Input value={kota} onChange={e => setKota(e.target.value)} placeholder="Nama kota..." />
        </div>
      </div>
```

- [ ] **Step 8: Commit**

```bash
git -C C:/Users/USER/projects/simhq add "frontend/app/(dashboard)/depot/pos/StepDataPembeli.tsx"
git -C C:/Users/USER/projects/simhq commit -m "feat(pos): add kelurahan, kecamatan, kode_pos to customer form"
```

---

## Task 6: StepReview — full redesign

**Files:**
- Modify: `frontend/app/(dashboard)/depot/pos/StepReview.tsx`

- [ ] **Step 1: Replace entire StepReview.tsx**

Replace entire content with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'

interface CsUser { id: number; name: string }

interface Summary {
  jenis: string
  tipeQurban: string
  kelasKode: string
  harga: number
  hewanNo: string | null
  preorder: boolean
  namaPembeli: string
  hp: string
}

interface Props {
  summary: Summary
  onSubmit: (data: {
    csId: number | null
    tellerId: number | null
    salesNama: string
    rencana_pelunasan: string
    metodeBayar: string
    tipeBayar: string
    nominalBayar: number
  }) => void
  onBack: () => void
  submitting: boolean
}

const METODE_OPTIONS = [
  { value: 'CASH',          label: 'Cash' },
  { value: 'TRANSFER_BCA',  label: 'Transfer BCA' },
  { value: 'TRANSFER_LAIN', label: 'Transfer Lain' },
]

export function StepReview({ summary, onSubmit, onBack, submitting }: Props) {
  const { data: session }  = useSession()
  const sessionUser        = (session?.user as any)
  const tellerId           = sessionUser?.id as number | undefined
  const tellerName         = sessionUser?.name as string | undefined

  const [csUsers,   setCsUsers]   = useState<CsUser[]>([])
  const [csId,      setCsId]      = useState<number | null>(null)
  const [salesNama, setSalesNama] = useState('')
  const [metode,    setMetode]    = useState('CASH')
  const [tipe,      setTipe]      = useState('PELUNASAN')
  const [nominal,   setNominal]   = useState(summary.harga)
  const [rencana,   setRencana]   = useState('')

  useEffect(() => {
    api.get('/api/users?role=CS_KETUA,CS_ANGGOTA').then(r => setCsUsers(r.data.data ?? []))
  }, [])

  const canSubmit = nominal > 0 && (tipe === 'PELUNASAN' || rencana !== '')

  function handleSubmit() {
    onSubmit({
      csId,
      tellerId: tellerId ?? null,
      salesNama,
      rencana_pelunasan: tipe === 'DP' ? rencana : '',
      metodeBayar: metode,
      tipeBayar:   tipe,
      nominalBayar: nominal,
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-surface-high rounded-xl p-4 space-y-2 text-sm font-body">
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Jenis</span>
          <span className="font-medium text-on-surface">{summary.jenis}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Tipe Qurban</span>
          <span className="font-medium text-on-surface">{summary.tipeQurban}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Kelas</span>
          <span className="font-medium text-on-surface">{summary.kelasKode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Hewan</span>
          <span className="font-medium text-on-surface">
            {summary.preorder
              ? <span className="italic text-yellow-700">Pre-order</span>
              : `#${summary.hewanNo}`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Pembeli</span>
          <span className="font-medium text-on-surface">{summary.namaPembeli} · {summary.hp}</span>
        </div>
        <div className="flex justify-between border-t border-surface-highest pt-2 mt-2">
          <span className="text-on-surface font-semibold">Total</span>
          <span className="font-semibold text-primary">
            {summary.harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Staff */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">CS</label>
          <select
            value={csId ?? ''}
            onChange={e => setCsId(e.target.value ? Number(e.target.value) : null)}
            className="input-field w-full"
          >
            <option value="">— Tidak ada —</option>
            {csUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Teller</label>
          <div className="input-field bg-surface-high text-on-surface-variant cursor-not-allowed select-none">
            {tellerName ?? '—'}
          </div>
        </div>

        <Input
          label="Sales"
          value={salesNama}
          onChange={e => setSalesNama(e.target.value)}
          placeholder="Nama sales..."
        />
      </div>

      {/* Payment */}
      <div className="space-y-3">
        <p className="text-sm font-body font-semibold text-on-surface">Pembayaran</p>

        <div>
          <label className="block text-xs font-body text-on-surface-variant mb-1.5">Metode</label>
          <div className="flex gap-2 flex-wrap">
            {METODE_OPTIONS.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMetode(m.value)}
                className={`px-3 py-1.5 rounded-lg border-2 text-sm font-body transition-colors ${
                  metode === m.value
                    ? 'border-primary bg-primary text-white'
                    : 'border-surface-high text-on-surface hover:border-primary/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-body text-on-surface-variant mb-1.5">Skema</label>
          <div className="flex gap-2">
            {[{ value: 'PELUNASAN', label: 'Lunas' }, { value: 'DP', label: 'DP' }].map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipe(t.value)}
                className={`px-4 py-1.5 rounded-lg border-2 text-sm font-body transition-colors ${
                  tipe === t.value
                    ? 'border-primary bg-primary text-white'
                    : 'border-surface-high text-on-surface hover:border-primary/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">
            Nominal {tipe === 'DP' ? 'DP' : 'Pembayaran'}
          </label>
          <input
            type="number"
            min={1}
            value={nominal}
            onChange={e => setNominal(Number(e.target.value))}
            className="input-field w-full"
          />
        </div>

        {tipe === 'DP' && (
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">
              Rencana Pelunasan *
            </label>
            <input
              type="date"
              value={rencana}
              onChange={e => setRencana(e.target.value)}
              className="input-field w-full"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onBack}>← Kembali</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} loading={submitting}>
          Simpan Transaksi
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C C:/Users/USER/projects/simhq add "frontend/app/(dashboard)/depot/pos/StepReview.tsx"
git -C C:/Users/USER/projects/simhq commit -m "feat(pos): redesign StepReview with CS filter, auto-teller, sales text, payment form"
```

---

## Task 7: page.tsx — FormState + submit flow

**Files:**
- Modify: `frontend/app/(dashboard)/depot/pos/page.tsx`

- [ ] **Step 1: Update FormState interface — add new fields**

Find:
```tsx
interface FormState {
  jenis: string
  kelasId: number | null
  tipeQurban: string
  harga: number
  kelasKode: string
  hewanId: number | null
  hewanNo: string | null
  preorder: boolean
  customerId: number | null
  namaPembeli: string
  hp: string
  alamat: string
  kota: string
}
```
Replace with:
```tsx
interface FormState {
  jenis: string
  kelasId: number | null
  tipeQurban: string
  harga: number
  kelasKode: string
  hewanId: number | null
  hewanNo: string | null
  preorder: boolean
  customerId: number | null
  namaPembeli: string
  hp: string
  alamat: string
  kelurahan: string
  kecamatan: string
  kode_pos: string
  kota: string
}
```

- [ ] **Step 2: Update INIT constant**

Find:
```tsx
const INIT: FormState = {
  jenis: 'SAPI', kelasId: null, tipeQurban: 'SHQ', harga: 0, kelasKode: '',
  hewanId: null, hewanNo: null, preorder: false,
  customerId: null, namaPembeli: '', hp: '', alamat: '', kota: '',
}
```
Replace with:
```tsx
const INIT: FormState = {
  jenis: 'SAPI', kelasId: null, tipeQurban: 'SHQ', harga: 0, kelasKode: '',
  hewanId: null, hewanNo: null, preorder: false,
  customerId: null, namaPembeli: '', hp: '', alamat: '',
  kelurahan: '', kecamatan: '', kode_pos: '', kota: '',
}
```

- [ ] **Step 3: Update onStep3Done — add new address fields**

Find:
```tsx
  function onStep3Done(data: { customerId: number; nama: string; hp: string; alamat: string; kota: string }) {
    setForm(f => ({
      ...f,
      customerId: data.customerId,
      namaPembeli: data.nama,
      hp: data.hp,
      alamat: data.alamat,
      kota: data.kota,
    }))
    setStep(3)
  }
```
Replace with:
```tsx
  function onStep3Done(data: { customerId: number; nama: string; hp: string; alamat: string; kelurahan: string; kecamatan: string; kode_pos: string; kota: string }) {
    setForm(f => ({
      ...f,
      customerId:  data.customerId,
      namaPembeli: data.nama,
      hp:          data.hp,
      alamat:      data.alamat,
      kelurahan:   data.kelurahan,
      kecamatan:   data.kecamatan,
      kode_pos:    data.kode_pos,
      kota:        data.kota,
    }))
    setStep(3)
  }
```

- [ ] **Step 4: Replace onStep4Done — split into transaksi + pembayaran**

Find the entire `onStep4Done` function:
```tsx
  async function onStep4Done(data: { csId: number | null; tellerId: number | null; salesId: number | null }) {
    if (!depotId || !form.kelasId || !form.customerId) return
    setSubmitting(true)
    try {
      await api.post('/api/transaksi', {
        depot_id:    depotId,
        hewan_id:    form.hewanId,
        customer_id: form.customerId,
        cs_id:       data.csId,
        teller_id:   data.tellerId,
        sales_id:    data.salesId,
        tipe_qurban: form.tipeQurban,
        jenis:       form.jenis,
        kelas_id:    form.kelasId,
        musim:       MUSIM,
      })
      router.push('/depot/transaksi')
    } catch {
      setSubmitting(false)
    }
  }
```
Replace with:
```tsx
  async function onStep4Done(data: {
    csId: number | null
    tellerId: number | null
    salesNama: string
    rencana_pelunasan: string
    metodeBayar: string
    tipeBayar: string
    nominalBayar: number
  }) {
    if (!depotId || !form.kelasId || !form.customerId) return
    setSubmitting(true)
    try {
      const res = await api.post('/api/transaksi', {
        depot_id:           depotId,
        hewan_id:           form.hewanId,
        customer_id:        form.customerId,
        cs_id:              data.csId,
        teller_id:          data.tellerId,
        sales_id:           null,
        sales_nama:         data.salesNama || null,
        rencana_pelunasan:  data.rencana_pelunasan || null,
        tipe_qurban:        form.tipeQurban,
        jenis:              form.jenis,
        kelas_id:           form.kelasId,
        musim:              MUSIM,
      })
      const transaksiId = res.data.transaksi.id

      await api.post(`/api/transaksi/${transaksiId}/bayar`, {
        jumlah:    data.nominalBayar,
        tipe:      data.tipeBayar,
        metode:    data.metodeBayar,
        teller_id: data.tellerId,
        tgl_bayar: new Date().toISOString().split('T')[0],
      })

      router.push('/depot/transaksi')
    } catch {
      setSubmitting(false)
    }
  }
```

- [ ] **Step 5: Pass kelasId to StepPilihHewan**

Find:
```tsx
        {step === 1 && (
          <StepPilihHewan
            jenis={form.jenis}
            hewanId={form.hewanId}
            preorder={form.preorder}
            onNext={onStep2Done}
            onBack={() => setStep(0)}
          />
        )}
```
Replace with:
```tsx
        {step === 1 && (
          <StepPilihHewan
            jenis={form.jenis}
            kelasId={form.kelasId}
            hewanId={form.hewanId}
            preorder={form.preorder}
            onNext={onStep2Done}
            onBack={() => setStep(0)}
          />
        )}
```

- [ ] **Step 6: Pass new address fields to StepDataPembeli**

Find the StepDataPembeli data prop:
```tsx
            data={{
              customerId: form.customerId,
              nama: form.namaPembeli,
              hp: form.hp,
              alamat: form.alamat,
              kota: form.kota,
            }}
```
Replace with:
```tsx
            data={{
              customerId: form.customerId,
              nama:       form.namaPembeli,
              hp:         form.hp,
              alamat:     form.alamat,
              kelurahan:  form.kelurahan,
              kecamatan:  form.kecamatan,
              kode_pos:   form.kode_pos,
              kota:       form.kota,
            }}
```

- [ ] **Step 7: Commit**

```bash
git -C C:/Users/USER/projects/simhq add "frontend/app/(dashboard)/depot/pos/page.tsx"
git -C C:/Users/USER/projects/simhq commit -m "feat(pos): update FormState, submit flow, pass kelasId + address fields"
```
