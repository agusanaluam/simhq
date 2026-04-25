# Isi Petak Kandang Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Isi Petak" UI to assign unassigned animals (petak_id = null) to a kandang petak via a multi-select checkbox modal.

**Architecture:** Backend adds `?unassigned=1` filter to `GET /api/hewan`. Frontend: `KandangPage` reads session depotId and passes to `HewanPanel`, which shows an "Isi Petak" button opening new `IsiPetakModal`. Modal fetches unassigned hewan, user selects multiple, submit calls `POST /api/hewan/{id}/transfer` for each via `Promise.all`.

**Tech Stack:** Laravel 11, PostgreSQL, Next.js 14 App Router, TypeScript, Tailwind CSS, existing `api` lib.

---

## File Map

| Action | File |
|--------|------|
| Create | `backend/tests/Feature/Hewan/HewanUnassignedFilterTest.php` |
| Modify | `backend/app/Http/Controllers/HewanController.php` (1 line) |
| Create | `frontend/app/(dashboard)/depot/kandang/IsiPetakModal.tsx` |
| Modify | `frontend/app/(dashboard)/depot/kandang/HewanPanel.tsx` |
| Modify | `frontend/app/(dashboard)/depot/kandang/page.tsx` |

---

## Task 1: Backend TDD — unassigned filter

**Files:**
- Create: `backend/tests/Feature/Hewan/HewanUnassignedFilterTest.php`

- [ ] **Step 1: Create test file**

```php
<?php
namespace Tests\Feature\Hewan;

use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\PetakKandang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HewanUnassignedFilterTest extends TestCase
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

    private function hewanPayload(): array
    {
        return [
            'depot_id'      => $this->depot->id,
            'kelas_asal_id' => $this->kelas->id,
            'kelas_jual_id' => $this->kelas->id,
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300,
            'tgl_masuk'     => '2026-05-01',
            'musim'         => 2026,
        ];
    }

    public function test_unassigned_filter_returns_only_animals_without_petak(): void
    {
        $petak = PetakKandang::create([
            'depot_id'      => $this->depot->id,
            'no_petak'      => 'S-01',
            'jenis_kandang' => 'SAPI',
            'kapasitas'     => 10,
            'posisi_x'      => 0,
            'posisi_y'      => 0,
        ]);

        $r1 = $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();
        $this->actingAs($this->superAdmin)
            ->postJson("/api/hewan/{$r1->json('hewan.id')}/transfer", ['ke_petak_id' => $petak->id])
            ->assertOk();

        $res = $this->actingAs($this->superAdmin)
            ->getJson('/api/hewan?unassigned=1')
            ->assertOk();

        $this->assertEquals(1, $res->json('total'));
        $this->assertNull($res->json('data.0.petak_id'));
    }

    public function test_without_unassigned_filter_returns_all_animals(): void
    {
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $this->hewanPayload())->assertCreated();

        $res = $this->actingAs($this->superAdmin)
            ->getJson('/api/hewan')
            ->assertOk();

        $this->assertEquals(2, $res->json('total'));
    }
}
```

- [ ] **Step 2: Run tests — confirm they FAIL**

```bash
php artisan test tests/Feature/Hewan/HewanUnassignedFilterTest.php --no-coverage
```

Expected: 2 failures (`test_unassigned_filter_returns_only_animals_without_petak` returns 2 instead of 1 because filter not implemented yet).

- [ ] **Step 3: Commit**

```bash
git add tests/Feature/Hewan/HewanUnassignedFilterTest.php
git commit -m "test(kandang): add failing HewanUnassignedFilterTest (TDD)"
```

---

## Task 2: Backend — add unassigned filter

**Files:**
- Modify: `backend/app/Http/Controllers/HewanController.php`

- [ ] **Step 1: Add unassigned filter to index()**

In `backend/app/Http/Controllers/HewanController.php`, find in `index()`:

```php
            ->when($request->musim,  fn($q) => $q->where('musim', $request->musim))
```

Add one line AFTER it:

```php
            ->when($request->musim,  fn($q) => $q->where('musim', $request->musim))
            ->when($request->boolean('unassigned'), fn($q) => $q->whereNull('petak_id'))
```

- [ ] **Step 2: Run unassigned filter tests — both must PASS**

```bash
php artisan test tests/Feature/Hewan/HewanUnassignedFilterTest.php --no-coverage
```

Expected:
```
PASS  Tests\Feature\Hewan\HewanUnassignedFilterTest
✓ unassigned filter returns only animals without petak
✓ without unassigned filter returns all animals

Tests: 2 passed
```

- [ ] **Step 3: Run full test suite — no regressions**

```bash
php artisan test --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/HewanController.php
git commit -m "feat(kandang): add ?unassigned=1 filter to GET /hewan"
```

---

## Task 3: Frontend — IsiPetakModal

**Files:**
- Create: `frontend/app/(dashboard)/depot/kandang/IsiPetakModal.tsx`

- [ ] **Step 1: Create IsiPetakModal.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'
import type { PetakData } from './PetakCard'
import api from '@/lib/api'

interface HewanItem {
  id: number
  no_hewan: string
  kelas_asal: { kode: string } | null
  kelas_jual: { kode: string } | null
  bobot_masuk: string
}

interface Props {
  petak: PetakData
  depotId: number
  musim: number
  onClose: () => void
  onSuccess: () => void
}

export function IsiPetakModal({ petak, depotId, musim, onClose, onSuccess }: Props) {
  const [hewan,    setHewan]    = useState<HewanItem[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const sisaSlot = petak.kapasitas - petak.jumlah_terisi

  useEffect(() => {
    api.get(`/api/hewan?depot=${depotId}&jenis=${petak.jenis_kandang}&musim=${musim}&unassigned=1&per_page=100`)
      .then(r => setHewan(r.data.data ?? []))
      .catch(() => setError('Gagal memuat daftar hewan.'))
  }, [depotId, petak.jenis_kandang, musim])

  function toggle(id: number) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleAssign() {
    if (selected.length === 0) return
    setLoading(true)
    setError('')
    try {
      await Promise.all(
        selected.map(id => api.post(`/api/hewan/${id}/transfer`, { ke_petak_id: petak.id }))
      )
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Gagal mengassign hewan.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface-lowest rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-bold text-lg text-on-surface">Isi Petak {petak.no_petak}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface text-xl leading-none">&times;</button>
        </div>
        <p className="text-sm text-on-surface-variant mb-4 font-body">
          {petak.jumlah_terisi}/{petak.kapasitas} terisi &middot; Sisa {sisaSlot} slot
        </p>

        <div className="flex-1 overflow-y-auto space-y-1 mb-4">
          {hewan.length === 0 && !error && (
            <p className="text-sm text-on-surface-variant italic py-4 text-center">
              Semua hewan sudah dialokasikan ke petak.
            </p>
          )}
          {hewan.map(h => {
            const isSelected = selected.includes(h.id)
            const isDisabled = !isSelected && selected.length >= sisaSlot
            return (
              <label
                key={h.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-surface-high'
                } ${isSelected ? 'bg-surface-high' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => !isDisabled && toggle(h.id)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="font-display font-bold text-sm text-primary w-10">{h.no_hewan}</span>
                <span className="text-sm text-on-surface-variant font-body">
                  {h.kelas_jual?.kode ?? h.kelas_asal?.kode ?? '—'} &middot; {h.bobot_masuk} kg
                </span>
              </label>
            )
          })}
        </div>

        {error && <p className="text-sm text-error mb-3">{error}</p>}

        <div className="flex items-center justify-between">
          <span className="text-sm text-on-surface-variant font-body">
            Dipilih: {selected.length} / maks {sisaSlot}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-body font-medium text-on-surface-variant hover:bg-surface-high transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={loading || selected.length === 0}
              className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white disabled:opacity-60 hover:bg-primary/90 transition-colors"
            >
              {loading ? 'Menyimpan...' : `Assign ${selected.length} Ekor`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "frontend/app/(dashboard)/depot/kandang/IsiPetakModal.tsx"
git commit -m "feat(kandang): add IsiPetakModal component"
```

---

## Task 4: Frontend — HewanPanel update

**Files:**
- Modify: `frontend/app/(dashboard)/depot/kandang/HewanPanel.tsx`

- [ ] **Step 1: Rewrite HewanPanel.tsx**

Replace the entire content of `frontend/app/(dashboard)/depot/kandang/HewanPanel.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { StatusChip } from '@/components/ui/StatusChip'
import Link from 'next/link'
import type { PetakData } from './PetakCard'
import { IsiPetakModal } from './IsiPetakModal'

const STATUS_CHIP: Record<string, 'TERSEDIA' | 'DIPESAN' | 'TERJUAL' | 'MATI'> = {
  AVAILABLE: 'TERSEDIA', BOOKED: 'DIPESAN',
  SOLD: 'TERJUAL', DELIVERED: 'TERJUAL', MATI: 'MATI',
}

interface Props {
  petak: PetakData | null
  depotId?: number
  musim?: number
  onClose: () => void
  onRefresh: () => void
}

export function HewanPanel({ petak, depotId, musim, onClose, onRefresh }: Props) {
  const [showIsi, setShowIsi] = useState(false)

  if (!petak) return null

  return (
    <Card className="w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-on-surface">Petak {petak.no_petak}</h3>
        <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface text-xl leading-none">&times;</button>
      </div>

      <p className="text-xs text-on-surface-variant mb-3 font-body">
        {petak.jenis_kandang} &middot; {petak.jumlah_terisi}/{petak.kapasitas} terisi
      </p>

      <div className="space-y-2">
        {petak.hewan.length === 0 && (
          <p className="text-sm text-on-surface-variant italic">Petak kosong</p>
        )}
        {petak.hewan.map(h => (
          <div key={h.id} className="flex items-center justify-between py-2 border-b border-surface-high last:border-0">
            <div>
              <p className="font-body font-medium text-on-surface text-sm">{h.no_hewan}</p>
              <p className="text-xs text-on-surface-variant">
                {h.jenis} &middot; {h.kelas_jual?.kode ?? '—'} &middot; {h.bobot_masuk} kg
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusChip status={STATUS_CHIP[h.status] ?? 'TERSEDIA'} />
              <Link href={`/depot/pengadaan/${h.id}`} className="text-xs text-primary hover:underline">Detail</Link>
            </div>
          </div>
        ))}
      </div>

      {petak.jumlah_terisi < petak.kapasitas && depotId && (
        <button
          onClick={() => setShowIsi(true)}
          className="mt-3 w-full text-sm font-body font-medium text-primary border border-primary rounded-xl py-1.5 hover:bg-primary/5 transition-colors"
        >
          + Isi Petak
        </button>
      )}

      {showIsi && depotId && (
        <IsiPetakModal
          petak={petak}
          depotId={depotId}
          musim={musim ?? new Date().getFullYear()}
          onClose={() => setShowIsi(false)}
          onSuccess={() => { setShowIsi(false); onRefresh() }}
        />
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "frontend/app/(dashboard)/depot/kandang/HewanPanel.tsx"
git commit -m "feat(kandang): add Isi Petak button and IsiPetakModal to HewanPanel"
```

---

## Task 5: Frontend — KandangPage update

**Files:**
- Modify: `frontend/app/(dashboard)/depot/kandang/page.tsx`

- [ ] **Step 1: Add session reading to KandangPage**

In `frontend/app/(dashboard)/depot/kandang/page.tsx`, inside `KandangPage()` function, after the state declarations, add:

```tsx
  const { data: session } = useSession()
  const sessionDepotId = (session?.user as any)?.depotId as number | undefined
  const musim = new Date().getFullYear()
```

Note: `useSession` is already imported at the top of the file (used by `TambahPetakModal`).

- [ ] **Step 2: Update HewanPanel render call**

Find:
```tsx
        <HewanPanel petak={selectedPetak} onClose={() => setSelectedId(null)} />
```

Replace with:
```tsx
        <HewanPanel
          petak={selectedPetak}
          depotId={sessionDepotId}
          musim={musim}
          onClose={() => setSelectedId(null)}
          onRefresh={loadPetak}
        />
```

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/(dashboard)/depot/kandang/page.tsx"
git commit -m "feat(kandang): pass depotId + musim + onRefresh to HewanPanel from KandangPage"
```

---

## Task 6: Smoke Test

- [ ] **Step 1: Add some animals via pengadaan without assigning a petak**

Navigate to `/depot/pengadaan` → click "+ Tambah 1 Ekor" → fill form, leave Kelas Jual empty → save. Repeat 2-3 times with jenis=SAPI.

- [ ] **Step 2: Open kandang page and click a SAPI petak**

Navigate to `/depot/kandang`. Click a SAPI petak. HewanPanel should appear on the right with "Isi Petak" button (only if `jumlah_terisi < kapasitas`).

- [ ] **Step 3: Open modal and assign animals**

Click "+ Isi Petak". Modal opens, shows list of unassigned SAPI hewan. Check 2 animals. Verify "Assign 2 Ekor" button appears. Verify unchecking more than `sisaSlot` is impossible. Click "Assign 2 Ekor".

- [ ] **Step 4: Verify animals appear in petak**

After modal closes, grid refreshes. The 2 animals should now appear as chips inside the petak card. HewanPanel should show the 2 animals.

- [ ] **Step 5: Verify full petak hides button**

If petak is now full (`jumlah_terisi === kapasitas`), "Isi Petak" button should not show.
