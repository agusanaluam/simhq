# T-04 Ploting Kandang Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Grid visual petak kandang — PetakKandang model, FK dari hewan.petak_id, CRUD petak, save layout posisiX/Y, drag-drop hewan antar petak (log riwayat otomatis), filter sapi/domba, kapasitas display.

**Architecture:** Backend — PetakKandang model + migration (add FK constraint on hewan.petak_id). Frontend — CSS grid berdasar posisiX/posisiY, @dnd-kit/core untuk drag-drop, polling 30s. Transfer hewan reuse endpoint `POST /api/hewan/{id}/transfer` dari T-03.

**Tech Stack:** Laravel 11, PostgreSQL, Next.js 14, @dnd-kit/core, Tailwind

---

## File Map

### Backend — Created
```
backend/
  app/Models/PetakKandang.php
  app/Http/Controllers/PetakController.php
  app/Http/Requests/StorePetakRequest.php
  database/migrations/*_create_petak_kandang_table.php
  database/migrations/*_add_petak_fk_to_hewan_table.php
  tests/Feature/Ploting/PetakTest.php
```

### Backend — Modified
```
  routes/api.php
```

### Frontend — Created
```
frontend/
  app/(dashboard)/depot/kandang/page.tsx
  app/(dashboard)/depot/kandang/PetakCard.tsx
  app/(dashboard)/depot/kandang/KandangGrid.tsx
  app/(dashboard)/depot/kandang/HewanPanel.tsx
```

### Frontend — Modified
```
  components/shared/Sidebar.tsx   ← add Kandang link
```

---

## Task 1: Migrations

- [ ] **Step 1: Create migrations**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan make:migration create_petak_kandang_table
php artisan make:migration add_petak_fk_to_hewan_table
```

- [ ] **Step 2: petak_kandang migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('petak_kandang', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->string('no_petak', 20);             // misal: S-01, D-03
            $table->enum('jenis_kandang', ['SAPI', 'DOMBA']);
            $table->unsignedTinyInteger('kapasitas')->default(1);
            $table->foreignId('kelas_id')->nullable()->constrained('kelas_hewan')->nullOnDelete();
            $table->unsignedTinyInteger('posisi_x')->default(0); // kolom grid
            $table->unsignedTinyInteger('posisi_y')->default(0); // baris grid
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['depot_id', 'no_petak'], 'petak_no_unique');
        });
    }
    public function down(): void { Schema::dropIfExists('petak_kandang'); }
};
```

- [ ] **Step 3: Add FK constraint to hewan.petak_id**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('hewan', function (Blueprint $table) {
            $table->foreign('petak_id')
                ->references('id')
                ->on('petak_kandang')
                ->nullOnDelete();
        });
    }
    public function down(): void {
        Schema::table('hewan', function (Blueprint $table) {
            $table->dropForeign(['petak_id']);
        });
    }
};
```

- [ ] **Step 4: Run migrations**

```bash
php artisan migrate
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/
git commit -m "feat(db): add petak_kandang table + FK hewan.petak_id → petak_kandang"
```

---

## Task 2: Model + Tests + Controller + Routes

- [ ] **Step 1: Create PetakKandang model**

```php
<?php
// backend/app/Models/PetakKandang.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PetakKandang extends Model
{
    protected $table = 'petak_kandang';

    protected $fillable = [
        'depot_id', 'no_petak', 'jenis_kandang', 'kapasitas',
        'kelas_id', 'posisi_x', 'posisi_y', 'is_active',
    ];

    protected $casts = [
        'kapasitas' => 'integer',
        'posisi_x'  => 'integer',
        'posisi_y'  => 'integer',
        'is_active' => 'boolean',
    ];

    public function depot(): BelongsTo { return $this->belongsTo(Depot::class); }
    public function kelas(): BelongsTo { return $this->belongsTo(KelasHewan::class, 'kelas_id'); }

    public function hewan(): HasMany
    {
        return $this->hasMany(Hewan::class, 'petak_id');
    }

    public function jumlahTerisi(): int
    {
        return $this->hewan()->whereNotIn('status', ['MATI', 'DELIVERED'])->count();
    }
}
```

- [ ] **Step 2: Write failing tests**

```php
<?php
// backend/tests/Feature/Ploting/PetakTest.php
namespace Tests\Feature\Ploting;

use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\PetakKandang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PetakTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->depot      = Depot::factory()->create();
    }

    public function test_list_petak_per_depot(): void
    {
        PetakKandang::create([
            'depot_id'     => $this->depot->id,
            'no_petak'     => 'S-01',
            'jenis_kandang'=> 'SAPI',
            'kapasitas'    => 5,
            'posisi_x'     => 0,
            'posisi_y'     => 0,
        ]);

        $this->actingAs($this->superAdmin)
            ->getJson("/api/petak?depot={$this->depot->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'no_petak', 'jenis_kandang', 'kapasitas', 'posisi_x', 'posisi_y']]]);
    }

    public function test_store_petak(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/petak', [
                'depot_id'      => $this->depot->id,
                'no_petak'      => 'S-01',
                'jenis_kandang' => 'SAPI',
                'kapasitas'     => 5,
                'posisi_x'      => 0,
                'posisi_y'      => 0,
            ])
            ->assertCreated()
            ->assertJsonPath('petak.no_petak', 'S-01');
    }

    public function test_update_petak_kapasitas(): void
    {
        $petak = PetakKandang::create([
            'depot_id'     => $this->depot->id,
            'no_petak'     => 'D-01',
            'jenis_kandang'=> 'DOMBA',
            'kapasitas'    => 3,
            'posisi_x'     => 1,
            'posisi_y'     => 0,
        ]);

        $this->actingAs($this->superAdmin)
            ->putJson("/api/petak/{$petak->id}", ['kapasitas' => 10])
            ->assertOk()
            ->assertJsonPath('petak.kapasitas', 10);
    }

    public function test_save_layout_updates_positions(): void
    {
        $p1 = PetakKandang::create(['depot_id' => $this->depot->id, 'no_petak' => 'S-01', 'jenis_kandang' => 'SAPI', 'kapasitas' => 1, 'posisi_x' => 0, 'posisi_y' => 0]);
        $p2 = PetakKandang::create(['depot_id' => $this->depot->id, 'no_petak' => 'S-02', 'jenis_kandang' => 'SAPI', 'kapasitas' => 1, 'posisi_x' => 1, 'posisi_y' => 0]);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/petak/layout', [
                'layout' => [
                    ['id' => $p1->id, 'posisi_x' => 2, 'posisi_y' => 1],
                    ['id' => $p2->id, 'posisi_x' => 3, 'posisi_y' => 1],
                ],
            ])
            ->assertOk();

        $this->assertDatabaseHas('petak_kandang', ['id' => $p1->id, 'posisi_x' => 2, 'posisi_y' => 1]);
    }
}
```

Run to confirm FAIL:
```bash
php artisan test tests/Feature/Ploting/
```

- [ ] **Step 3: Create StorePetakRequest**

```php
<?php
// backend/app/Http/Requests/StorePetakRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePetakRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id'      => ['required', 'exists:depots,id'],
            'no_petak'      => ['required', 'string', 'max:20'],
            'jenis_kandang' => ['required', 'in:SAPI,DOMBA'],
            'kapasitas'     => ['required', 'integer', 'min:1', 'max:100'],
            'kelas_id'      => ['nullable', 'exists:kelas_hewan,id'],
            'posisi_x'      => ['required', 'integer', 'min:0'],
            'posisi_y'      => ['required', 'integer', 'min:0'],
        ];
    }
}
```

- [ ] **Step 4: Create PetakController**

```php
<?php
// backend/app/Http/Controllers/PetakController.php
namespace App\Http\Controllers;

use App\Http\Requests\StorePetakRequest;
use App\Models\PetakKandang;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PetakController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $petak = PetakKandang::with([
                'kelas:id,kode',
                'hewan' => fn($q) => $q->with(['kelasJual:id,kode'])->whereNotIn('status', ['MATI', 'DELIVERED']),
            ])
            ->when($request->depot, fn($q) => $q->where('depot_id', $request->depot))
            ->when($request->jenis,  fn($q) => $q->where('jenis_kandang', $request->jenis))
            ->where('is_active', true)
            ->orderBy('posisi_y')
            ->orderBy('posisi_x')
            ->get()
            ->map(fn($p) => array_merge($p->toArray(), [
                'jumlah_terisi' => $p->hewan->count(),
            ]));

        return response()->json(['data' => $petak]);
    }

    public function store(StorePetakRequest $request): JsonResponse
    {
        $petak = PetakKandang::create($request->validated());

        return response()->json(['petak' => $petak->load('kelas:id,kode')], 201);
    }

    public function update(Request $request, PetakKandang $petak): JsonResponse
    {
        $data = $request->validate([
            'no_petak'      => ['sometimes', 'string', 'max:20'],
            'jenis_kandang' => ['sometimes', 'in:SAPI,DOMBA'],
            'kapasitas'     => ['sometimes', 'integer', 'min:1', 'max:100'],
            'kelas_id'      => ['sometimes', 'nullable', 'exists:kelas_hewan,id'],
            'posisi_x'      => ['sometimes', 'integer', 'min:0'],
            'posisi_y'      => ['sometimes', 'integer', 'min:0'],
            'is_active'     => ['sometimes', 'boolean'],
        ]);

        $petak->update($data);

        return response()->json(['petak' => $petak->fresh()]);
    }

    public function saveLayout(Request $request): JsonResponse
    {
        $request->validate([
            'layout'           => ['required', 'array', 'min:1'],
            'layout.*.id'      => ['required', 'exists:petak_kandang,id'],
            'layout.*.posisi_x'=> ['required', 'integer', 'min:0'],
            'layout.*.posisi_y'=> ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($request) {
            foreach ($request->layout as $item) {
                PetakKandang::where('id', $item['id'])
                    ->update(['posisi_x' => $item['posisi_x'], 'posisi_y' => $item['posisi_y']]);
            }
        });

        return response()->json(['message' => 'Layout disimpan.']);
    }
}
```

- [ ] **Step 5: Add routes to api.php**

Inside `auth:sanctum` group, add:

```php
use App\Http\Controllers\PetakController;

// Petak Kandang
Route::get('petak', [PetakController::class, 'index']);
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,KANDANG_SAPI_KETUA,KANDANG_DOMBA_KETUA')->group(function () {
    Route::post('petak',          [PetakController::class, 'store']);
    Route::put('petak/{petak}',   [PetakController::class, 'update']);
    Route::post('petak/layout',   [PetakController::class, 'saveLayout']);
});
```

**IMPORTANT:** `petak/layout` (static) MUST be declared BEFORE `petak/{petak}` (wildcard) to avoid route conflict.

- [ ] **Step 6: Run all tests**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan test
```

Expected: 33 tests pass (29 existing + 4 new).

- [ ] **Step 7: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/
git commit -m "feat(kandang): PetakKandang model + CRUD + saveLayout + 33 tests"
```

---

## Task 3: Frontend — Kandang Grid

- [ ] **Step 1: Install @dnd-kit**

```bash
cd /c/Users/USER/projects/simhq/frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Create PetakCard component**

```tsx
// frontend/app/(dashboard)/depot/kandang/PetakCard.tsx
import { cn } from '@/lib/utils'

type HewanInPetak = {
  id: number; no_hewan: string; jenis: string; status: string
  kelas_jual: { kode: string } | null
}

type PetakData = {
  id: number; no_petak: string; jenis_kandang: string
  kapasitas: number; jumlah_terisi: number
  kelas: { kode: string } | null
  hewan: HewanInPetak[]
}

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: 'bg-[#dcfce7] border-[#15803d]',
  BOOKED:    'bg-[#fef9c3] border-[#854d0e]',
  SOLD:      'bg-[#dbeef8] border-[#2779a7]',
}

interface Props {
  petak: PetakData
  selected: boolean
  onClick: () => void
  isDragOver?: boolean
}

export function PetakCard({ petak, selected, onClick, isDragOver }: Props) {
  const pct = petak.kapasitas > 0 ? (petak.jumlah_terisi / petak.kapasitas) * 100 : 0
  const full = petak.jumlah_terisi >= petak.kapasitas

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border-2 p-2 cursor-pointer transition-all min-h-[80px]',
        selected   ? 'border-primary bg-surface-high shadow-card' : 'border-surface-high bg-surface-lowest',
        isDragOver ? 'border-accent bg-[#fef9c3]' : '',
        full       ? 'opacity-75' : ''
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-display font-bold text-sm text-on-surface">{petak.no_petak}</span>
        <span className={cn('text-xs font-body', full ? 'text-error' : 'text-on-surface-variant')}>
          {petak.jumlah_terisi}/{petak.kapasitas}
        </span>
      </div>

      {/* Capacity bar */}
      <div className="h-1 bg-surface-high rounded-full mb-2">
        <div
          className={cn('h-1 rounded-full transition-all', full ? 'bg-error' : 'bg-primary')}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* Hewan chips */}
      <div className="flex flex-wrap gap-1">
        {petak.hewan.slice(0, 4).map(h => (
          <span
            key={h.id}
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-body border',
              STATUS_COLOR[h.status] ?? 'bg-surface-high border-surface-highest'
            )}
          >
            {h.no_hewan}
          </span>
        ))}
        {petak.hewan.length > 4 && (
          <span className="text-xs text-on-surface-variant">+{petak.hewan.length - 4}</span>
        )}
        {petak.hewan.length === 0 && (
          <span className="text-xs text-on-surface-variant italic">Kosong</span>
        )}
      </div>

      {petak.kelas && (
        <p className="text-xs text-on-surface-variant mt-1.5 font-body">Kelas {petak.kelas.kode}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create HewanPanel (sidebar detail)**

```tsx
// frontend/app/(dashboard)/depot/kandang/HewanPanel.tsx
'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import Link from 'next/link'

type HewanInPetak = {
  id: number; no_hewan: string; jenis: string; status: string
  bobot_masuk: string; kelas_jual: { kode: string } | null
}

type PetakData = {
  id: number; no_petak: string; jenis_kandang: string
  kapasitas: number; jumlah_terisi: number
  hewan: HewanInPetak[]
}

const STATUS_CHIP: Record<string, 'TERSEDIA' | 'DIPESAN' | 'TERJUAL' | 'MATI'> = {
  AVAILABLE: 'TERSEDIA', BOOKED: 'DIPESAN',
  SOLD: 'TERJUAL', DELIVERED: 'TERJUAL', MATI: 'MATI',
}

interface Props {
  petak: PetakData | null
  onClose: () => void
}

export function HewanPanel({ petak, onClose }: Props) {
  if (!petak) return null

  return (
    <Card className="w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-on-surface">Petak {petak.no_petak}</h3>
        <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface text-lg leading-none">×</button>
      </div>

      <p className="text-xs text-on-surface-variant mb-3 font-body">
        {petak.jenis_kandang} · {petak.jumlah_terisi}/{petak.kapasitas} terisi
      </p>

      <div className="space-y-2">
        {petak.hewan.length === 0 && (
          <p className="text-sm text-on-surface-variant italic">Petak kosong</p>
        )}
        {petak.hewan.map(h => (
          <div key={h.id} className="flex items-center justify-between py-2 border-b border-surface-high last:border-0">
            <div>
              <p className="font-body font-medium text-on-surface text-sm">{h.no_hewan}</p>
              <p className="text-xs text-on-surface-variant">{h.jenis} · {h.kelas_jual?.kode ?? '—'} · {h.bobot_masuk} kg</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusChip status={STATUS_CHIP[h.status] ?? 'TERSEDIA'} />
              <Link href={`/depot/pengadaan/${h.id}`} className="text-xs text-primary hover:underline">Detail</Link>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
```

- [ ] **Step 4: Create KandangGrid with drag-drop**

```tsx
// frontend/app/(dashboard)/depot/kandang/KandangGrid.tsx
'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'
import { PetakCard } from './PetakCard'
import api from '@/lib/api'

type HewanInPetak = {
  id: number; no_hewan: string; jenis: string; status: string
  bobot_masuk: string; kelas_jual: { kode: string } | null
}

type PetakData = {
  id: number; no_petak: string; jenis_kandang: string
  kapasitas: number; jumlah_terisi: number; posisi_x: number; posisi_y: number
  kelas: { kode: string } | null; hewan: HewanInPetak[]
}

interface Props {
  petak: PetakData[]
  selectedId: number | null
  onSelect: (id: number) => void
  onRefresh: () => void
}

function DroppablePetak({ petak, selected, onClick }: { petak: PetakData; selected: boolean; onClick: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `petak-${petak.id}` })
  return (
    <div ref={setNodeRef}>
      <PetakCard petak={petak} selected={selected} onClick={onClick} isDragOver={isOver} />
    </div>
  )
}

function DraggableHewan({ hewanId, noHewan }: { hewanId: number; noHewan: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `hewan-${hewanId}` })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined

  return (
    <span
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-body border bg-surface-lowest border-surface-high cursor-grab ${isDragging ? 'opacity-50' : ''}`}
    >
      {noHewan}
    </span>
  )
}

export function KandangGrid({ petak, selectedId, onSelect, onRefresh }: Props) {
  const [activeHewan, setActiveHewan] = useState<{ id: number; noHewan: string } | null>(null)

  if (petak.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-on-surface-variant text-sm">
        Belum ada petak kandang. Tambah petak via tombol Konfigurasi.
      </div>
    )
  }

  const maxX = Math.max(...petak.map(p => p.posisi_x), 0)
  const maxY = Math.max(...petak.map(p => p.posisi_y), 0)
  const cols = maxX + 1
  const rows = maxY + 1

  const petakMap: Record<string, PetakData> = {}
  petak.forEach(p => { petakMap[`${p.posisi_x}-${p.posisi_y}`] = p })

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveHewan(null)
    if (!over || !active) return

    const hewanId  = parseInt(String(active.id).replace('hewan-', ''))
    const petakId  = parseInt(String(over.id).replace('petak-', ''))
    if (isNaN(hewanId) || isNaN(petakId)) return

    try {
      await api.post(`/api/hewan/${hewanId}/transfer`, { ke_petak_id: petakId })
      onRefresh()
    } catch (e) {
      console.error('Transfer gagal', e)
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd} onDragStart={e => {
      const id = parseInt(String(e.active.id).replace('hewan-', ''))
      const h  = petak.flatMap(p => p.hewan).find(h => h.id === id)
      if (h) setActiveHewan({ id: h.id, noHewan: h.no_hewan })
    }}>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(120px, 1fr))` }}
      >
        {Array.from({ length: rows }).flatMap((_, y) =>
          Array.from({ length: cols }).map((_, x) => {
            const p = petakMap[`${x}-${y}`]
            if (!p) return <div key={`empty-${x}-${y}`} className="min-h-[80px]" />
            return (
              <DroppablePetak
                key={p.id}
                petak={{
                  ...p,
                  hewan: p.hewan.map(h => ({
                    ...h,
                    draggableEl: <DraggableHewan key={h.id} hewanId={h.id} noHewan={h.no_hewan} />,
                  })) as any,
                }}
                selected={selectedId === p.id}
                onClick={() => onSelect(p.id)}
              />
            )
          })
        )}
      </div>

      <DragOverlay>
        {activeHewan && (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-body bg-accent text-on-accent shadow-card">
            {activeHewan.noHewan}
          </span>
        )}
      </DragOverlay>
    </DndContext>
  )
}
```

- [ ] **Step 5: Create main kandang page**

```tsx
// frontend/app/(dashboard)/depot/kandang/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { KandangGrid } from './KandangGrid'
import { HewanPanel } from './HewanPanel'
import api from '@/lib/api'

type HewanInPetak = {
  id: number; no_hewan: string; jenis: string; status: string
  bobot_masuk: string; kelas_jual: { kode: string } | null
}

type PetakData = {
  id: number; no_petak: string; jenis_kandang: string
  kapasitas: number; jumlah_terisi: number; posisi_x: number; posisi_y: number
  kelas: { kode: string } | null; hewan: HewanInPetak[]
}

export default function KandangPage() {
  const [petak, setPetak]         = useState<PetakData[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [jenisFilter, setJenis]   = useState<'SAPI' | 'DOMBA'>('SAPI')
  const [loading, setLoading]     = useState(true)

  const loadPetak = useCallback(() => {
    setLoading(true)
    api.get(`/api/petak?jenis=${jenisFilter}`)
      .then(r => setPetak(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [jenisFilter])

  useEffect(() => {
    loadPetak()
    // Poll every 30 seconds
    const interval = setInterval(loadPetak, 30_000)
    return () => clearInterval(interval)
  }, [loadPetak])

  const selectedPetak = petak.find(p => p.id === selectedId) ?? null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Ploting Kandang</h1>
          <p className="text-sm text-on-surface-variant mt-1">Grid visual posisi hewan per petak</p>
        </div>
        <div className="flex gap-2">
          {/* Filter toggle */}
          <div className="flex bg-surface-high rounded-xl p-1 gap-1">
            {(['SAPI', 'DOMBA'] as const).map(j => (
              <button
                key={j}
                onClick={() => setJenis(j)}
                className={`px-4 py-1.5 rounded-lg text-sm font-body font-medium transition-colors ${
                  jenisFilter === j
                    ? 'bg-surface-lowest text-on-surface shadow-card'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {j === 'SAPI' ? '🐄 Sapi' : '🐑 Domba'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs font-body text-on-surface-variant">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#dcfce7] border border-[#15803d] inline-block" /> Tersedia</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#fef9c3] border border-[#854d0e] inline-block" /> Dipesan</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#dbeef8] border border-[#2779a7] inline-block" /> Terjual</span>
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          {loading ? (
            <p className="text-sm text-on-surface-variant py-8 text-center">Memuat...</p>
          ) : (
            <KandangGrid
              petak={petak}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onRefresh={loadPetak}
            />
          )}
        </div>

        <HewanPanel
          petak={selectedPetak}
          onClose={() => setSelectedId(null)}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Add Kandang to Sidebar**

In `frontend/components/shared/Sidebar.tsx`, add `Grid3x3` to lucide-react imports and add to navItems after Pengadaan:

```tsx
{ href: '/depot/kandang', label: 'Ploting Kandang', icon: Grid3x3, roles: ['SUPER_ADMIN','KEPALA_DEPOT','KANDANG_SAPI_KETUA','KANDANG_SAPI_ANGGOTA','KANDANG_DOMBA_KETUA','KANDANG_DOMBA_ANGGOTA'] },
```

- [ ] **Step 7: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend
npx tsc --noEmit
```

Fix any errors. Expected: 0.

- [ ] **Step 8: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/
git commit -m "feat(ui): ploting kandang — grid visual, drag-drop transfer, filter sapi/domba, panel detail"
```

---

## Task 4: Update TASKS.md

- [ ] Mark `docs/tasks/T-04-ploting-kandang.md` → `DONE`
- [ ] Update `docs/TASKS.md` T-04 row → `✅ DONE`
- [ ] Commit: `docs: mark T-04 as DONE`

---

## Acceptance Criteria Checklist

- [ ] petak_kandang table created, hewan.petak_id has FK constraint
- [ ] `GET /api/petak` returns petak with hewan[] + jumlah_terisi
- [ ] `POST /api/petak/layout` updates posisiX/Y for multiple petak atomically
- [ ] 33 backend tests pass
- [ ] Grid renders based on posisi_x/posisi_y CSS grid
- [ ] Drag hewan chip → drops on target petak → calls POST /api/hewan/{id}/transfer → grid refreshes
- [ ] Polling 30s active
- [ ] Filter sapi/domba toggle works
- [ ] HewanPanel shows hewan list on petak click
- [ ] TypeScript: 0 errors
