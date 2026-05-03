# RAB ↔ BIOP Relation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link KasHarian (BIOP) entries to RAB budget categories so manual pengeluaran kas can be tracked against anggaran.

**Architecture:** Add nullable `rab_id` FK to `kas_harian` table via migration. Extend `KasController::store()` to accept and validate `rab_id`. In the frontend modal, show a RAB dropdown when tipe=KELUAR, pre-populated with sisa anggaran. KasTable adds a RAB indicator column.

**Tech Stack:** Laravel 11 (PHP), Next.js 14 (TypeScript), Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `backend/database/migrations/2026_04_25_add_rab_id_to_kas_harian_table.php` | New — add rab_id nullable FK |
| `backend/app/Models/KasHarian.php` | Add rab_id to fillable + rab() relation |
| `backend/app/Http/Controllers/KasController.php` | Accept rab_id in store(), load rab in index() |
| `frontend/app/(dashboard)/keuangan/components/TambahKasModal.tsx` | RAB dropdown when KELUAR |
| `frontend/app/(dashboard)/keuangan/components/KasTable.tsx` | Add RAB column |
| `frontend/app/(dashboard)/keuangan/page.tsx` | Update KasEntry interface |

---

## Task 1: Migration + KasHarian Model

**Files:**
- Create: `backend/database/migrations/2026_04_25_add_rab_id_to_kas_harian_table.php`
- Modify: `backend/app/Models/KasHarian.php`

- [ ] **Step 1: Create migration**

Create file `backend/database/migrations/2026_04_25_add_rab_id_to_kas_harian_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kas_harian', function (Blueprint $table) {
            $table->foreignId('rab_id')
                  ->nullable()
                  ->after('transaksi_id')
                  ->constrained('rab')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('kas_harian', function (Blueprint $table) {
            $table->dropForeign(['rab_id']);
            $table->dropColumn('rab_id');
        });
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd C:/Users/USER/projects/simhq/backend && php artisan migrate
```

Expected output includes:
```
  Migrating: 2026_04_25_add_rab_id_to_kas_harian_table
  Migrated:  2026_04_25_add_rab_id_to_kas_harian_table
```

- [ ] **Step 3: Update KasHarian model**

Read `backend/app/Models/KasHarian.php` first.

Replace entire file:

```php
<?php

namespace App\Models;

use App\Enums\TipeKas;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KasHarian extends Model
{
    protected $table = 'kas_harian';

    protected $fillable = [
        'depot_id', 'tipe', 'sumber', 'divisi', 'keterangan',
        'jumlah', 'metode', 'tgl_transaksi', 'input_by', 'transaksi_id', 'rab_id',
    ];

    protected $casts = [
        'tipe'          => TipeKas::class,
        'jumlah'        => 'integer',
        'tgl_transaksi' => 'date',
    ];

    public function depot(): BelongsTo     { return $this->belongsTo(Depot::class); }
    public function inputBy(): BelongsTo   { return $this->belongsTo(User::class, 'input_by'); }
    public function transaksi(): BelongsTo { return $this->belongsTo(Transaksi::class); }
    public function rab(): BelongsTo       { return $this->belongsTo(Rab::class); }
}
```

- [ ] **Step 4: Run tests**

```bash
cd C:/Users/USER/projects/simhq/backend && php artisan test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/USER/projects/simhq && git add backend/database/migrations/2026_04_25_add_rab_id_to_kas_harian_table.php backend/app/Models/KasHarian.php
git commit -m "feat(biop): add rab_id nullable FK to kas_harian + KasHarian relation"
```

---

## Task 2: KasController — accept + load rab_id

**Files:**
- Modify: `backend/app/Http/Controllers/KasController.php`

- [ ] **Step 1: Add rab_id to store() validation**

In `KasController::store()`, find the `$data = $request->validate([...])` block. Add `rab_id` rule after the existing rules:

```php
        $data = $request->validate([
            'tipe'          => ['required', 'in:MASUK,KELUAR'],
            'sumber'        => [Rule::requiredIf($request->tipe === 'MASUK'), 'nullable', Rule::in(array_column(SumberKas::cases(), 'value'))],
            'divisi'        => [Rule::requiredIf($request->tipe === 'KELUAR'), 'nullable', 'string', 'max:30'],
            'keterangan'    => ['required', 'string', 'max:300'],
            'jumlah'        => ['required', 'integer', 'min:1'],
            'metode'        => ['required', 'in:CASH,TRANSFER_BCA,TRANSFER_LAIN'],
            'tgl_transaksi' => ['required', 'date'],
            'rab_id'        => ['sometimes', 'nullable', 'exists:rab,id'],
        ]);
```

After validation, add depot ownership check for rab_id:

```php
        if (! empty($data['rab_id'])) {
            abort_unless(
                \App\Models\Rab::where('id', $data['rab_id'])->where('depot_id', $depotId)->exists(),
                403,
                'RAB tidak ditemukan di depot ini.'
            );
        }
```

- [ ] **Step 2: Load rab relation in index()**

In `KasController::index()`, find the `->with('inputBy:id,name')` call and extend it:

```php
        $entries = (clone $base)
            ->with('inputBy:id,name', 'rab:id,divisi,musim')
            ->orderBy('tgl_transaksi', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(50);
```

- [ ] **Step 3: Run tests**

```bash
cd C:/Users/USER/projects/simhq/backend && php artisan test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/USER/projects/simhq && git add backend/app/Http/Controllers/KasController.php
git commit -m "feat(biop): accept + validate rab_id in KasController store(), load in index()"
```

---

## Task 3: Frontend — TambahKasModal RAB dropdown + KasTable + interfaces

**Files:**
- Modify: `frontend/app/(dashboard)/keuangan/components/TambahKasModal.tsx`
- Modify: `frontend/app/(dashboard)/keuangan/components/KasTable.tsx`
- Modify: `frontend/app/(dashboard)/keuangan/page.tsx`

- [ ] **Step 1: Update TambahKasModal — add RAB state + fetch**

Read `frontend/app/(dashboard)/keuangan/components/TambahKasModal.tsx` first.

Replace entire file:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

const SUMBER_OPTIONS = ['PENJUALAN', 'DEPOSIT', 'LAIN']
const DIVISI_OPTIONS = ['KONSTRUKSI', 'LOGISTIK', 'ADMIN', 'CS', 'KANDANG', 'DISTRIBUSI', 'PAKAN', 'LISTRIK', 'LAIN']
const METODE_OPTIONS = [
  { value: 'CASH',          label: 'Tunai' },
  { value: 'TRANSFER_BCA',  label: 'Transfer BCA' },
  { value: 'TRANSFER_LAIN', label: 'Transfer Lain' },
]

interface RabOption {
  rab_id: number
  divisi: string
  jumlah_anggaran: number
  total_realisasi: number
  selisih: number
}

interface TambahKasModalProps {
  onDone:  () => void
  onClose: () => void
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export function TambahKasModal({ onDone, onClose }: TambahKasModalProps) {
  const [form, setForm] = useState({
    tipe:          'MASUK',
    sumber:        'DEPOSIT',
    divisi:        'ADMIN',
    keterangan:    '',
    jumlah:        '',
    metode:        'CASH',
    tgl_transaksi: new Date().toISOString().slice(0, 10),
    rab_id:        '',
  })
  const [rabOptions, setRabOptions] = useState<RabOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    const musim = new Date().getFullYear()
    api.get(`/api/keuangan/rab/summary?musim=${musim}`)
      .then(r => setRabOptions(r.data.data ?? []))
      .catch(() => {})
  }, [])

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit() {
    if (!form.keterangan || !form.jumlah || !form.tgl_transaksi) {
      setError('Keterangan, jumlah, dan tanggal wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/keuangan/kas', {
        tipe:          form.tipe,
        sumber:        form.tipe === 'MASUK'  ? form.sumber : undefined,
        divisi:        form.tipe === 'KELUAR' ? form.divisi : undefined,
        keterangan:    form.keterangan,
        jumlah:        Number(form.jumlah),
        metode:        form.metode,
        tgl_transaksi: form.tgl_transaksi,
        rab_id:        form.tipe === 'KELUAR' && form.rab_id ? Number(form.rab_id) : null,
      })
      onDone()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  const labelClass = 'text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-1 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-card w-full max-w-md p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-on-surface">Tambah Kas</h2>

        <div>
          <label className={labelClass}>Tipe</label>
          <div className="flex gap-2">
            {['MASUK', 'KELUAR'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('tipe', t)}
                className={`flex-1 py-2 rounded-lg text-sm font-body font-medium border transition-colors ${
                  form.tipe === t
                    ? t === 'MASUK'
                      ? 'bg-[#dcfce7] border-[#15803d] text-[#15803d]'
                      : 'bg-[#fee2e2] border-error text-error'
                    : 'border-surface-high text-on-surface-variant hover:bg-surface-low'
                }`}
              >
                {t === 'MASUK' ? 'Kas Masuk' : 'Kas Keluar'}
              </button>
            ))}
          </div>
        </div>

        {form.tipe === 'MASUK' ? (
          <div>
            <label className={labelClass}>Sumber</label>
            <select value={form.sumber} onChange={(e) => set('sumber', e.target.value)} className="input-field">
              {SUMBER_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className={labelClass}>Divisi</label>
              <select value={form.divisi} onChange={(e) => set('divisi', e.target.value)} className="input-field">
                {DIVISI_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Bebankan ke RAB <span className="normal-case text-on-surface-variant">(opsional)</span></label>
              <select value={form.rab_id} onChange={(e) => set('rab_id', e.target.value)} className="input-field">
                <option value="">— Tidak dibebankan ke RAB —</option>
                {rabOptions.map((r) => (
                  <option key={r.rab_id} value={r.rab_id}>
                    {r.divisi} — Sisa {rupiah(r.selisih)}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <Input
          label="Keterangan"
          value={form.keterangan}
          onChange={(e) => set('keterangan', e.target.value)}
          placeholder="Mis. Setoran tunai penjualan sore"
        />
        <Input
          label="Jumlah (Rp)"
          type="number"
          min="1"
          value={form.jumlah}
          onChange={(e) => set('jumlah', e.target.value)}
          placeholder="5000000"
        />

        <div>
          <label className={labelClass}>Metode</label>
          <select value={form.metode} onChange={(e) => set('metode', e.target.value)} className="input-field">
            {METODE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <Input
          label="Tanggal"
          type="date"
          value={form.tgl_transaksi}
          onChange={(e) => set('tgl_transaksi', e.target.value)}
        />

        {error && (
          <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={submit} loading={saving} className="flex-1">Simpan</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update KasEntry interface in page.tsx**

In `frontend/app/(dashboard)/keuangan/page.tsx`, find the `KasEntry` interface (lines 12-22) and add `rab` field:

```tsx
interface KasEntry {
  id: number
  tipe: 'MASUK' | 'KELUAR'
  sumber: string | null
  divisi: string | null
  keterangan: string
  jumlah: number
  metode: string
  tgl_transaksi: string
  input_by: { id: number; name: string } | null
  rab: { id: number; divisi: string; musim: number } | null
}
```

- [ ] **Step 3: Update KasTable — add RAB column**

Read `frontend/app/(dashboard)/keuangan/components/KasTable.tsx` first.

Replace entire file:

```tsx
import { Card } from '@/components/ui/Card'

interface KasEntry {
  id: number
  tipe: 'MASUK' | 'KELUAR'
  sumber: string | null
  divisi: string | null
  keterangan: string
  jumlah: number
  metode: string
  tgl_transaksi: string
  input_by: { id: number; name: string } | null
  rab: { id: number; divisi: string; musim: number } | null
}

interface KasTableProps {
  entries: KasEntry[]
}

const METODE_SHORT: Record<string, string> = {
  CASH:          'Tunai',
  TRANSFER_BCA:  'BCA',
  TRANSFER_LAIN: 'Transfer',
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

function formatTgl(str: string): string {
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function KasTable({ entries }: KasTableProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant text-center py-8">
          Belum ada transaksi untuk filter ini.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Tanggal', 'Keterangan', 'Sumber/Divisi', 'RAB', 'Metode', 'Jumlah'].map((h) => (
                <th key={h} className="text-left pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                <td className="py-2.5 pr-4 font-body text-on-surface-variant whitespace-nowrap">
                  {formatTgl(e.tgl_transaksi)}
                </td>
                <td className="py-2.5 pr-4 font-body text-on-surface max-w-xs truncate">
                  {e.keterangan}
                </td>
                <td className="py-2.5 pr-4 font-body text-on-surface-variant">
                  {e.sumber ?? e.divisi ?? '—'}
                </td>
                <td className="py-2.5 pr-4 font-body text-on-surface-variant">
                  {e.rab ? (
                    <span className="text-xs bg-surface-high px-1.5 py-0.5 rounded font-medium">
                      {e.rab.divisi}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-2.5 pr-4 font-body text-on-surface-variant">
                  {METODE_SHORT[e.metode] ?? e.metode}
                </td>
                <td className={`py-2.5 font-display font-semibold whitespace-nowrap ${
                  e.tipe === 'MASUK' ? 'text-[#15803d]' : 'text-error'
                }`}>
                  {e.tipe === 'KELUAR' ? '−' : '+'}{rupiah(e.jumlah)}
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

- [ ] **Step 4: TypeScript check**

```bash
cd C:/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | grep -i "error\|keuangan" | head -20
```

Expected: no output.

- [ ] **Step 5: Commit frontend**

```bash
cd C:/Users/USER/projects/simhq && git add "frontend/app/(dashboard)/keuangan/components/TambahKasModal.tsx" "frontend/app/(dashboard)/keuangan/components/KasTable.tsx" "frontend/app/(dashboard)/keuangan/page.tsx"
git commit -m "feat(biop): add RAB dropdown to kas modal + RAB column in kas table"
```

---

## Done

Kas KELUAR entries can now optionally be linked to a RAB budget item. The dropdown shows remaining anggaran per divisi. The table shows a RAB badge for linked entries.
