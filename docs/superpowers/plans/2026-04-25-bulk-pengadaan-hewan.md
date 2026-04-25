# Bulk Pengadaan Hewan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bulk animal intake to pengadaan — staff can register N animals per submission with shared header fields and per-row kelas/bobot.

**Architecture:** New `POST /api/hewan/bulk` endpoint accepts shared fields + `rows[]` array, processes all rows in one DB transaction with sequential `no_hewan` generation. New `BulkTambahHewanModal` on frontend. Existing single-animal flow unchanged.

**Tech Stack:** Laravel 11, PostgreSQL, Next.js 14 App Router, TypeScript, Tailwind CSS, existing UI primitives (Button, Card, input-field class).

---

## File Map

| Action | File |
|--------|------|
| Create | `backend/app/Http/Requests/BulkStoreHewanRequest.php` |
| Modify | `backend/app/Http/Controllers/HewanController.php` |
| Modify | `backend/routes/api.php` |
| Create | `backend/tests/Feature/Hewan/BulkHewanTest.php` |
| Create | `frontend/app/(dashboard)/depot/pengadaan/BulkTambahHewanModal.tsx` |
| Modify | `frontend/app/(dashboard)/depot/pengadaan/page.tsx` |

---

## Task 1: Write Failing Tests (TDD)

**Files:**
- Create: `backend/tests/Feature/Hewan/BulkHewanTest.php`

- [ ] **Step 1: Create the test file**

```php
<?php
namespace Tests\Feature\Hewan;

use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BulkHewanTest extends TestCase
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

    private function payload(array $override = []): array
    {
        return array_merge([
            'depot_id'    => $this->depot->id,
            'supplier_id' => null,
            'jenis'       => 'SAPI',
            'tgl_masuk'   => '2026-05-01',
            'musim'       => 2026,
            'rows'        => [
                ['kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 300],
                ['kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 280],
                ['kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 320],
            ],
        ], $override);
    }

    public function test_bulk_store_returns_201_with_correct_count(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->payload())
            ->assertCreated()
            ->assertJsonPath('count', 3)
            ->assertJsonCount(3, 'hewan');
    }

    public function test_bulk_store_assigns_sequential_no_hewan(): void
    {
        $res = $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->payload())
            ->assertCreated();

        $numbers = collect($res->json('hewan'))->pluck('no_hewan')->sort()->values()->toArray();
        $this->assertEquals(['600', '601', '602'], $numbers);
    }

    public function test_empty_rows_returns_422(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->payload(['rows' => []]))
            ->assertUnprocessable();
    }

    public function test_rows_exceeding_50_returns_422(): void
    {
        $row  = ['kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 300];
        $rows = array_fill(0, 51, $row);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->payload(['rows' => $rows]))
            ->assertUnprocessable();
    }

    public function test_invalid_kelas_asal_id_returns_422(): void
    {
        $bad = [['kelas_asal_id' => 9999, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 300]];

        $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->payload(['rows' => $bad]))
            ->assertUnprocessable();
    }

    public function test_bobot_masuk_zero_returns_422(): void
    {
        $bad = [['kelas_asal_id' => $this->kelas->id, 'kelas_jual_id' => $this->kelas->id, 'bobot_masuk' => 0]];

        $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan/bulk', $this->payload(['rows' => $bad]))
            ->assertUnprocessable();
    }
}
```

- [ ] **Step 2: Run tests — confirm they all FAIL**

```bash
cd backend && php artisan test tests/Feature/Hewan/BulkHewanTest.php --no-coverage
```

Expected: 5 failures — `Route [POST /api/hewan/bulk] not defined` or 404/405.

---

## Task 2: Backend — Request, Controller, Route

**Files:**
- Create: `backend/app/Http/Requests/BulkStoreHewanRequest.php`
- Modify: `backend/app/Http/Controllers/HewanController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create BulkStoreHewanRequest**

```php
<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkStoreHewanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id'             => ['required', 'exists:depots,id'],
            'supplier_id'          => ['nullable', 'exists:supplier,id'],
            'jenis'                => ['required', 'in:SAPI,DOMBA'],
            'tgl_masuk'            => ['required', 'date'],
            'musim'                => ['required', 'integer', 'min:2020', 'max:2100'],
            'rows'                 => ['required', 'array', 'min:1', 'max:50'],
            'rows.*.kelas_asal_id' => ['required', 'exists:kelas_hewan,id'],
            'rows.*.kelas_jual_id' => ['required', 'exists:kelas_hewan,id'],
            'rows.*.bobot_masuk'   => ['required', 'numeric', 'min:1'],
        ];
    }
}
```

- [ ] **Step 2: Add imports to HewanController**

In `backend/app/Http/Controllers/HewanController.php`, add these lines after the existing `use` statements at the top:

```php
use App\Http\Requests\BulkStoreHewanRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
```

- [ ] **Step 3: Add storeBulk method to HewanController**

Add this method after the `store()` method (around line 41), before `show()`:

```php
    public function storeBulk(BulkStoreHewanRequest $request): JsonResponse
    {
        $data   = $request->validated();
        $shared = Arr::except($data, ['rows']);

        $created = DB::transaction(function () use ($shared, $data) {
            return collect($data['rows'])->map(function ($row) use ($shared) {
                $row             = array_merge($shared, $row);
                $row['no_hewan'] = $this->hewanService->generateNoHewan(
                    $shared['depot_id'], $shared['musim'], $shared['jenis']
                );
                return Hewan::create($row);
            });
        });

        return response()->json(['hewan' => $created, 'count' => $created->count()], 201);
    }
```

- [ ] **Step 4: Add route in api.php**

In `backend/routes/api.php` at line 129, inside the `role:SUPER_ADMIN,KEPALA_DEPOT,KANDANG_SAPI_KETUA,KANDANG_DOMBA_KETUA` middleware group, add the bulk route as the **first line** before `Route::post('hewan', ...)`:

```php
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,KANDANG_SAPI_KETUA,KANDANG_DOMBA_KETUA')->group(function () {
        Route::post('hewan/bulk',               [HewanController::class, 'storeBulk']); // ← add this line
        Route::post('hewan',                    [HewanController::class, 'store']);
        Route::put('hewan/{hewan}',             [HewanController::class, 'update']);
        Route::post('hewan/{hewan}/transfer',   [HewanController::class, 'transfer']);
    });
```

- [ ] **Step 5: Run tests — confirm all 5 PASS**

```bash
cd backend && php artisan test tests/Feature/Hewan/BulkHewanTest.php --no-coverage
```

Expected output:
```
PASS  Tests\Feature\Hewan\BulkHewanTest
✓ bulk store returns 201 with correct count
✓ bulk store assigns sequential no hewan
✓ empty rows returns 422
✓ rows exceeding 50 returns 422
✓ invalid kelas asal id returns 422
✓ bobot masuk zero returns 422

Tests: 5 passed
```

- [ ] **Step 6: Run full test suite to check no regressions**

```bash
cd backend && php artisan test --no-coverage
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/app/Http/Requests/BulkStoreHewanRequest.php \
        backend/app/Http/Controllers/HewanController.php \
        backend/routes/api.php \
        backend/tests/Feature/Hewan/BulkHewanTest.php
git commit -m "feat(pengadaan): add POST /hewan/bulk endpoint for bulk animal intake"
```

---

## Task 3: Frontend — BulkTambahHewanModal

**Files:**
- Create: `frontend/app/(dashboard)/depot/pengadaan/BulkTambahHewanModal.tsx`

- [ ] **Step 1: Create the modal component**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface Props { onClose: () => void; onSuccess: () => void }
interface KelasHewan { id: number; kode: string }
interface Depot { id: number; nama: string }
interface Supplier { id: number; nama: string }
interface Row { kelas_asal_id: string; kelas_jual_id: string; bobot_masuk: string }

const emptyRow = (): Row => ({ kelas_asal_id: '', kelas_jual_id: '', bobot_masuk: '' })

export function BulkTambahHewanModal({ onClose, onSuccess }: Props) {
  const [kelas,    setKelas]    = useState<KelasHewan[]>([])
  const [depots,   setDepots]   = useState<Depot[]>([])
  const [supplier, setSupplier] = useState<Supplier[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const [shared, setShared] = useState({
    depot_id: '', supplier_id: '', jenis: 'SAPI',
    tgl_masuk: new Date().toISOString().split('T')[0],
    musim: String(new Date().getFullYear()),
  })
  const [rows, setRows] = useState<Row[]>([emptyRow()])

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelas(r.data.data))
    api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
    api.get('/api/supplier').then(r => setSupplier(r.data.data ?? []))
  }, [])

  const setS = (k: string, v: string) => setShared(s => ({ ...s, [k]: v }))

  function updateRow(i: number, k: keyof Row, v: string) {
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  }

  function addRow()         { setRows(rs => [...rs, emptyRow()]) }
  function removeRow(i: number) { setRows(rs => rs.filter((_, idx) => idx !== i)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/hewan/bulk', {
        depot_id:    Number(shared.depot_id),
        supplier_id: shared.supplier_id ? Number(shared.supplier_id) : null,
        jenis:       shared.jenis,
        tgl_masuk:   shared.tgl_masuk,
        musim:       Number(shared.musim),
        rows: rows.map(r => ({
          kelas_asal_id: Number(r.kelas_asal_id),
          kelas_jual_id: Number(r.kelas_jual_id),
          bobot_masuk:   parseFloat(r.bobot_masuk),
        })),
      })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Gagal menyimpan hewan.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-on-surface/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="font-display font-semibold text-lg mb-5">Tambah Hewan Massal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Shared header fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Depot</label>
              <select value={shared.depot_id} onChange={e => setS('depot_id', e.target.value)} className="input-field mt-1.5" required>
                <option value="">Pilih depot...</option>
                {depots.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Supplier</label>
              <select value={shared.supplier_id} onChange={e => setS('supplier_id', e.target.value)} className="input-field mt-1.5">
                <option value="">Pilih supplier...</option>
                {supplier.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Jenis</label>
              <select value={shared.jenis} onChange={e => setS('jenis', e.target.value)} className="input-field mt-1.5">
                <option value="SAPI">Sapi</option>
                <option value="DOMBA">Domba</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Tanggal Masuk</label>
              <input type="date" value={shared.tgl_masuk} onChange={e => setS('tgl_masuk', e.target.value)} className="input-field mt-1.5" required />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Musim</label>
              <input type="number" value={shared.musim} onChange={e => setS('musim', e.target.value)} className="input-field mt-1.5" required />
            </div>
          </div>

          {/* Per-animal rows */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  {['#', 'Kelas Asal', 'Kelas Jual', 'Bobot (kg)', ''].map(h => (
                    <th key={h} className="pb-2 pr-2 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="pr-2 py-1.5 text-on-surface-variant w-6">{i + 1}</td>
                    <td className="pr-2 py-1.5">
                      <select value={row.kelas_asal_id} onChange={e => updateRow(i, 'kelas_asal_id', e.target.value)} className="input-field" required>
                        <option value="">Pilih...</option>
                        {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
                      </select>
                    </td>
                    <td className="pr-2 py-1.5">
                      <select value={row.kelas_jual_id} onChange={e => updateRow(i, 'kelas_jual_id', e.target.value)} className="input-field" required>
                        <option value="">Pilih...</option>
                        {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
                      </select>
                    </td>
                    <td className="pr-2 py-1.5">
                      <input
                        type="number" step="0.01" min="1"
                        value={row.bobot_masuk}
                        onChange={e => updateRow(i, 'bobot_masuk', e.target.value)}
                        className="input-field w-24" required
                      />
                    </td>
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        disabled={rows.length === 1}
                        className="text-error hover:opacity-70 disabled:opacity-30 text-sm px-2"
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button type="button" onClick={addRow} className="text-sm text-primary hover:underline font-body">
              + Tambah Baris
            </button>
            <span className="text-sm text-on-surface-variant">{rows.length} ekor</span>
          </div>

          {error && <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
            <Button type="submit" loading={loading} disabled={rows.length === 0}>
              Simpan {rows.length} Ekor
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/\(dashboard\)/depot/pengadaan/BulkTambahHewanModal.tsx
git commit -m "feat(pengadaan): add BulkTambahHewanModal component"
```

---

## Task 4: Frontend — Update page.tsx

**Files:**
- Modify: `frontend/app/(dashboard)/depot/pengadaan/page.tsx`

- [ ] **Step 1: Add import for BulkTambahHewanModal**

At the top of `page.tsx`, after the existing `TambahHewanModal` import, add:

```tsx
import { BulkTambahHewanModal } from './BulkTambahHewanModal'
```

- [ ] **Step 2: Add showBulk state**

Inside `PengadaanPage()`, after the existing `showSupplier` state line, add:

```tsx
const [showBulk, setShowBulk] = useState(false)
```

- [ ] **Step 3: Replace the button area**

Find this block (around line 176):
```tsx
          <Button variant="secondary" onClick={() => setShowSupplier(true)}>+ Tambah Supplier</Button>
          <Button onClick={() => setShowModal(true)}>+ Tambah Hewan</Button>
```

Replace with:
```tsx
          <Button variant="secondary" onClick={() => setShowSupplier(true)}>+ Tambah Supplier</Button>
          <Button variant="secondary" onClick={() => setShowBulk(true)}>+ Tambah Massal</Button>
          <Button onClick={() => setShowModal(true)}>+ Tambah 1 Ekor</Button>
```

- [ ] **Step 4: Add BulkTambahHewanModal to render**

Find this block (around line 234):
```tsx
      {showModal && (
        <TambahHewanModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadHewan() }}
        />
      )}
```

Add directly after it:
```tsx
      {showBulk && (
        <BulkTambahHewanModal
          onClose={() => setShowBulk(false)}
          onSuccess={() => { setShowBulk(false); loadHewan() }}
        />
      )}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/\(dashboard\)/depot/pengadaan/page.tsx
git commit -m "feat(pengadaan): add Tambah Massal button wiring bulk modal"
```

---

## Task 5: Smoke Test + Mark Done

- [ ] **Step 1: Start dev server (if not running)**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Manual smoke test**

1. Navigate to `/depot/pengadaan`
2. Click **+ Tambah Massal**
3. Select depot, jenis=SAPI, fill tgl_masuk + musim
4. Row 1: any kelas, bobot 300
5. Click **+ Tambah Baris** → Row 2: any kelas, bobot 280
6. Click **+ Tambah Baris** → Row 3: any kelas, bobot 320
7. Click **Simpan 3 Ekor**
8. Verify 3 new animals appear in the list with sequential no_hewan (e.g. 600, 601, 602)
9. Verify single-animal flow still works via **+ Tambah 1 Ekor**

- [ ] **Step 3: Update TASKS.md**

In `docs/TASKS.md`, there is no existing task ID for this feature (it's an improvement, not a numbered task). No update needed.

- [ ] **Step 4: Final commit if any fixes were applied during smoke test**

```bash
git add -p
git commit -m "fix(pengadaan): smoke test fixes for bulk modal"
```

Only run this step if fixes were needed.
