# T-15 Upload Foto Hewan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload 1–2 photos per animal, serve via public storage, show in internal detail page and public catalog cards.

**Architecture:** New `foto_hewan` table. `FotoHewanController` handles upload (multipart, max 5MB, JPG/PNG only), list, and delete using Laravel's `public` disk (`storage/app/public/hewan/{hewan_id}/`). No server-side compression for MVP — just validate size + type. `KatalogController::catalog()` augmented with a second query to get one `foto_url` per kelas/jenis group. Frontend: new `/depot/pengadaan/[id]/page.tsx` (hewan detail with photo uploader); `HewanCard.tsx` updated to display photo when present.

**Tech Stack:** Laravel 11 (Storage public disk, UploadedFile validation, RefreshDatabase), Next.js 14 App Router, TypeScript, PHPUnit TDD

---

## File Map

### Backend — Create
```
backend/
  database/migrations/2026_04_24_300000_create_foto_hewan_table.php
  app/Models/FotoHewan.php
  app/Http/Controllers/FotoHewanController.php
  tests/Feature/Hewan/FotoHewanTest.php
```

### Backend — Modify
```
backend/app/Models/Hewan.php              (add fotos() HasMany relation)
backend/app/Http/Controllers/KatalogController.php  (add foto_url per kelas/jenis)
backend/routes/api.php                    (add foto routes)
```

### Frontend — Create
```
frontend/app/(dashboard)/depot/pengadaan/[id]/page.tsx
```

### Frontend — Modify
```
frontend/app/katalog/components/HewanCard.tsx  (show foto_url)
```

---

## Task 1: Migration + FotoHewan Model + Hewan Relation

**Files:**
- Create: `backend/database/migrations/2026_04_24_300000_create_foto_hewan_table.php`
- Create: `backend/app/Models/FotoHewan.php`
- Modify: `backend/app/Models/Hewan.php`

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
        Schema::create('foto_hewan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hewan_id')->constrained('hewan')->cascadeOnDelete();
            $table->string('url', 500);
            $table->unsignedTinyInteger('urutan')->default(1);
            $table->foreignId('upload_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('foto_hewan');
    }
};
```

Save to `backend/database/migrations/2026_04_24_300000_create_foto_hewan_table.php`.

- [ ] **Step 2: Create FotoHewan model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class FotoHewan extends Model
{

    protected $table = 'foto_hewan';

    protected $fillable = ['hewan_id', 'url', 'urutan', 'upload_by'];

    protected $casts = ['urutan' => 'integer'];

    protected $appends = ['foto_url'];

    public function hewan(): BelongsTo    { return $this->belongsTo(Hewan::class); }
    public function uploadBy(): BelongsTo { return $this->belongsTo(User::class, 'upload_by'); }

    public function getFotoUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->url);
    }
}
```

Save to `backend/app/Models/FotoHewan.php`.

- [ ] **Step 3: Add fotos() relation to Hewan model**

In `backend/app/Models/Hewan.php`, add `HasMany` import and the relation method.

Add to use statements at top:
```php
use Illuminate\Database\Eloquent\Relations\HasMany;
```

Add relation at end of class (before closing brace):
```php
    public function fotos(): HasMany { return $this->hasMany(FotoHewan::class); }
```

- [ ] **Step 4: Run migration**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan migrate
```

Expected: `Migrating: 2026_04_24_300000_create_foto_hewan_table` → `Migrated`.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/2026_04_24_300000_create_foto_hewan_table.php \
        backend/app/Models/FotoHewan.php \
        backend/app/Models/Hewan.php
git commit -m "feat(foto-hewan): add foto_hewan migration, FotoHewan model, Hewan.fotos() relation"
```

---

## Task 2: Write Failing FotoHewanTest (TDD)

**Files:**
- Create: `backend/tests/Feature/Hewan/FotoHewanTest.php`

- [ ] **Step 1: Write test file**

```php
<?php

namespace Tests\Feature\Hewan;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\FotoHewan;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FotoHewanTest extends TestCase
{
    use RefreshDatabase;

    private User   $kandang;
    private Depot  $depot;
    private Hewan  $hewan;
    private int    $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->depot   = Depot::factory()->create();
        $this->kandang = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KANDANG_SAPI_KETUA,
        ]);

        $kelas      = KelasHewan::create(['kode' => 'A', 'nama' => 'Kelas A', 'urutan' => 1]);
        $supplier   = Supplier::create(['nama' => 'GUM', 'is_gum' => true, 'is_active' => true]);
        $this->hewan = Hewan::create([
            'depot_id'      => $this->depot->id,
            'supplier_id'   => $supplier->id,
            'kelas_asal_id' => $kelas->id,
            'kelas_jual_id' => $kelas->id,
            'no_hewan'      => '001',
            'jenis'         => 'SAPI',
            'bobot_masuk'   => 300.00,
            'tgl_masuk'     => today()->toDateString(),
            'musim'         => (int) date('Y'),
            'status'        => 'AVAILABLE',
        ]);
    }

    private function fakeJpg(): UploadedFile
    {
        return UploadedFile::fake()->image('hewan.jpg', 600, 400);
    }

    // ─── index ───────────────────────────────────────────────────────────────

    public function test_can_list_fotos(): void
    {
        FotoHewan::create(['hewan_id' => $this->hewan->id, 'url' => 'hewan/1/test.jpg', 'urutan' => 1]);

        $res = $this->actingAs($this->kandang)
            ->getJson("/api/hewan/{$this->hewan->id}/foto");

        $res->assertOk()->assertJsonStructure(['data' => [['id', 'url', 'urutan', 'foto_url']]]);
        $this->assertCount(1, $res->json('data'));
    }

    // ─── store ───────────────────────────────────────────────────────────────

    public function test_can_upload_foto(): void
    {
        $res = $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/foto", [
                'foto'   => $this->fakeJpg(),
                'urutan' => 1,
            ]);

        $res->assertCreated()
            ->assertJsonStructure(['foto' => ['id', 'url', 'urutan'], 'url']);

        $this->assertDatabaseHas('foto_hewan', ['hewan_id' => $this->hewan->id, 'urutan' => 1]);

        // File should be stored on the fake public disk
        $storedUrl = $res->json('foto.url');
        Storage::disk('public')->assertExists($storedUrl);
    }

    public function test_upload_validates_file_type(): void
    {
        $pdf = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');

        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/foto", ['foto' => $pdf, 'urutan' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['foto']);
    }

    public function test_upload_validates_max_size(): void
    {
        $big = UploadedFile::fake()->image('big.jpg')->size(6000); // 6MB

        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/foto", ['foto' => $big, 'urutan' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['foto']);
    }

    public function test_upload_rejects_more_than_2_fotos(): void
    {
        FotoHewan::create(['hewan_id' => $this->hewan->id, 'url' => 'hewan/1/a.jpg', 'urutan' => 1]);
        FotoHewan::create(['hewan_id' => $this->hewan->id, 'url' => 'hewan/1/b.jpg', 'urutan' => 2]);

        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$this->hewan->id}/foto", ['foto' => $this->fakeJpg(), 'urutan' => 1])
            ->assertUnprocessable();
    }

    public function test_cannot_upload_to_other_depots_hewan(): void
    {
        $otherDepot = Depot::factory()->create();
        $kelas      = KelasHewan::first();
        $otherHewan = Hewan::create([
            'depot_id' => $otherDepot->id, 'supplier_id' => $this->hewan->supplier_id,
            'kelas_asal_id' => $kelas->id, 'kelas_jual_id' => $kelas->id,
            'no_hewan' => '002', 'jenis' => 'SAPI', 'bobot_masuk' => 200,
            'tgl_masuk' => today()->toDateString(), 'musim' => (int) date('Y'), 'status' => 'AVAILABLE',
        ]);

        $this->actingAs($this->kandang)
            ->postJson("/api/hewan/{$otherHewan->id}/foto", ['foto' => $this->fakeJpg(), 'urutan' => 1])
            ->assertForbidden();
    }

    // ─── destroy ─────────────────────────────────────────────────────────────

    public function test_can_delete_foto(): void
    {
        $foto = FotoHewan::create([
            'hewan_id' => $this->hewan->id,
            'url'      => 'hewan/1/test.jpg',
            'urutan'   => 1,
        ]);

        $res = $this->actingAs($this->kandang)
            ->deleteJson("/api/hewan/{$this->hewan->id}/foto/{$foto->id}");

        $res->assertOk()->assertJsonPath('message', 'Foto dihapus.');
        $this->assertDatabaseMissing('foto_hewan', ['id' => $foto->id]);
    }

    // ─── auth ────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access(): void
    {
        $this->getJson("/api/hewan/{$this->hewan->id}/foto")->assertUnauthorized();
    }
}
```

Save to `backend/tests/Feature/Hewan/FotoHewanTest.php`.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Hewan/FotoHewanTest.php --no-coverage 2>&1 | tail -10
```

Expected: all tests FAIL with 404.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/tests/Feature/Hewan/FotoHewanTest.php
git commit -m "test(foto-hewan): add failing FotoHewanTest (TDD)"
```

---

## Task 3: FotoHewanController + Routes + Catalog Foto Integration

**Files:**
- Create: `backend/app/Http/Controllers/FotoHewanController.php`
- Modify: `backend/routes/api.php`
- Modify: `backend/app/Http/Controllers/KatalogController.php`

- [ ] **Step 1: Write FotoHewanController**

```php
<?php

namespace App\Http\Controllers;

use App\Models\FotoHewan;
use App\Models\Hewan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FotoHewanController extends Controller
{
    public function index(Hewan $hewan): JsonResponse
    {
        return response()->json([
            'data' => $hewan->fotos()->orderBy('urutan')->get(),
        ]);
    }

    public function store(Request $request, Hewan $hewan): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        abort_unless((int) $hewan->depot_id === (int) $depotId, 403);

        if ($hewan->fotos()->count() >= 2) {
            return response()->json(['message' => 'Maksimal 2 foto per hewan.'], 422);
        }

        $request->validate([
            'foto'   => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
            'urutan' => ['required', 'integer', 'in:1,2'],
        ]);

        $path = $request->file('foto')->store("hewan/{$hewan->id}", 'public');

        $foto = FotoHewan::create([
            'hewan_id'  => $hewan->id,
            'url'       => $path,
            'urutan'    => $request->urutan,
            'upload_by' => $user->id,
        ]);

        return response()->json([
            'foto' => $foto,
            'url'  => Storage::disk('public')->url($path),
        ], 201);
    }

    public function destroy(Request $request, Hewan $hewan, FotoHewan $foto): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        abort_unless((int) $hewan->depot_id === (int) $depotId, 403);
        abort_unless((int) $foto->hewan_id === (int) $hewan->id, 422);

        Storage::disk('public')->delete($foto->url);
        $foto->delete();

        return response()->json(['message' => 'Foto dihapus.']);
    }
}
```

Save to `backend/app/Http/Controllers/FotoHewanController.php`.

- [ ] **Step 2: Register foto routes in `backend/routes/api.php`**

In the hewan section (INSIDE auth:sanctum, in the `role:SUPER_ADMIN,KEPALA_DEPOT,KANDANG_SAPI_KETUA,KANDANG_DOMBA_KETUA` middleware group), add foto routes. Place them BEFORE the `{hewan}` wildcard routes:

```php
// Foto Hewan — foto routes MUST be before {hewan} wildcard
Route::get('hewan/{hewan}/foto',         [\App\Http\Controllers\FotoHewanController::class, 'index']);
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,KANDANG_SAPI_KETUA,KANDANG_DOMBA_KETUA,KANDANG_SAPI_ANGGOTA,KANDANG_DOMBA_ANGGOTA')->group(function () {
    Route::post('hewan/{hewan}/foto',          [\App\Http\Controllers\FotoHewanController::class, 'store']);
    Route::delete('hewan/{hewan}/foto/{foto}', [\App\Http\Controllers\FotoHewanController::class, 'destroy']);
});
```

Place these after the static routes (`hewan/statistik`, `hewan/cetak-label`, `hewan/sapi/ploting`) and BEFORE `Route::get('hewan/{hewan}', ...)`.

The foto GET route should be accessible to all authenticated users (for catalog and detail pages), so place it outside any role restriction. The POST/DELETE need kandang roles.

- [ ] **Step 3: Update KatalogController to include foto_url**

In `backend/app/Http/Controllers/KatalogController.php`, modify the `catalog()` method. After the `$items` collection is built, add a second query to get photos and merge:

Replace the final `return response()->json(...)` with:

```php
        // Fetch one foto per kelas/jenis group
        $fotoRows = DB::table('foto_hewan as fh')
            ->join('hewan as h', 'h.id', '=', 'fh.hewan_id')
            ->join('kelas_hewan as kj', 'kj.id', '=', 'h.kelas_jual_id')
            ->where('h.depot_id', $depotId)
            ->where('h.musim', $musim)
            ->where('h.status', 'AVAILABLE')
            ->orderBy('fh.id')
            ->select('kj.nama as kelas', 'h.jenis', 'fh.url')
            ->get()
            ->unique(fn($r) => "{$r->kelas}_{$r->jenis}")
            ->keyBy(fn($r) => "{$r->kelas}_{$r->jenis}");

        $appUrl  = config('app.url');
        $itemsWithFoto = $items->map(fn($item) => array_merge($item, [
            'foto_url' => isset($fotoRows["{$item['kelas']}_{$item['jenis']}"])
                ? "{$appUrl}/storage/" . $fotoRows["{$item['kelas']}_{$item['jenis']}"]->url
                : null,
        ]));

        return response()->json(['musim' => $musim, 'data' => $itemsWithFoto->values()->all()]);
```

Remove the original `return response()->json(['musim' => $musim, 'data' => $items->values()->all()]);`.

- [ ] **Step 4: Run tests — expect all green**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Hewan/FotoHewanTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/FotoHewanController.php \
        backend/routes/api.php \
        backend/app/Http/Controllers/KatalogController.php
git commit -m "feat(foto-hewan): add FotoHewanController, routes, and catalog foto integration"
```

---

## Task 4: Frontend — Hewan Detail Page with FotoUploader

**Files:**
- Create: `frontend/app/(dashboard)/depot/pengadaan/[id]/page.tsx`

- [ ] **Step 1: Write hewan detail page**

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Trash2, Upload } from 'lucide-react'
import api from '@/lib/api'

interface FotoItem {
  id:       number
  url:      string
  urutan:   number
  foto_url: string
}

interface HewanDetail {
  id:           number
  no_hewan:     string
  jenis:        string
  status:       string
  bobot_masuk:  string
  bobot_terkini: string | null
  tgl_masuk:    string
  musim:        number
  kelas_asal:   { kode: string; nama: string } | null
  kelas_jual:   { kode: string; nama: string } | null
  supplier:     { nama: string } | null
}

export default function HewanDetailPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [hewan,   setHewan]   = useState<HewanDetail | null>(null)
  const [fotos,   setFotos]   = useState<FotoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [hewanRes, fotoRes] = await Promise.all([
        api.get(`/api/hewan/${id}`),
        api.get(`/api/hewan/${id}/foto`),
      ])
      setHewan(hewanRes.data.hewan ?? hewanRes.data)
      setFotos(fotoRes.data.data ?? [])
    } catch {
      setError('Gagal memuat data hewan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (fotos.length >= 2) { setUploadError('Maksimal 2 foto per hewan.'); return }

    setUploading(true)
    setUploadError('')
    try {
      const form = new FormData()
      form.append('foto', file)
      form.append('urutan', String(fotos.length + 1))
      await api.post(`/api/hewan/${id}/foto`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await loadData()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setUploadError(msg ?? 'Gagal upload foto.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(fotoId: number) {
    if (!confirm('Hapus foto ini?')) return
    try {
      await api.delete(`/api/hewan/${id}/foto/${fotoId}`)
      setFotos((prev) => prev.filter((f) => f.id !== fotoId))
    } catch {
      alert('Gagal menghapus foto.')
    }
  }

  if (loading) return <div className="p-8 text-center text-on-surface-variant">Memuat...</div>
  if (error)   return <div className="p-8 text-center text-error">{error}</div>
  if (!hewan)  return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-on-surface-variant hover:text-on-surface">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display font-bold text-xl text-on-surface">
          Hewan #{hewan.no_hewan}
        </h1>
      </div>

      {/* Info */}
      <Card>
        <h2 className="font-display font-semibold text-base text-on-surface mb-3">Informasi Hewan</h2>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          {[
            ['Jenis',        hewan.jenis],
            ['Status',       hewan.status],
            ['Kelas Asal',   hewan.kelas_asal?.nama ?? '—'],
            ['Kelas Jual',   hewan.kelas_jual?.nama ?? '—'],
            ['Bobot Masuk',  `${hewan.bobot_masuk} kg`],
            ['Bobot Terkini', hewan.bobot_terkini ? `${hewan.bobot_terkini} kg` : '—'],
            ['Tgl Masuk',    hewan.tgl_masuk],
            ['Musim',        String(hewan.musim)],
            ['Supplier',     hewan.supplier?.nama ?? '—'],
          ].map(([label, value]) => (
            <>
              <span key={`l-${label}`} className="font-body text-on-surface-variant">{label}</span>
              <span key={`v-${label}`} className="font-body font-medium text-on-surface">{value}</span>
            </>
          ))}
        </div>
      </Card>

      {/* Foto */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-base text-on-surface">Foto ({fotos.length}/2)</h2>
          {fotos.length < 2 && (
            <label className="cursor-pointer">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
              <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={uploading}>
                <Upload className="w-4 h-4" />
                Upload Foto
              </Button>
            </label>
          )}
        </div>

        {uploadError && (
          <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md mb-3">{uploadError}</p>
        )}

        {fotos.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-6">Belum ada foto. Upload foto dari HP kandang.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {fotos.map((f) => (
              <div key={f.id} className="relative group rounded-xl overflow-hidden border border-surface-high">
                <img src={f.foto_url} alt={`Foto ${f.urutan}`} className="w-full h-40 object-cover" />
                <button
                  onClick={() => handleDelete(f.id)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-md">
                  Foto {f.urutan}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/depot/pengadaan/[id]/page.tsx`.

- [ ] **Step 2: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output. Fix any errors before committing.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/depot/pengadaan/[id]/page.tsx"
git commit -m "feat(foto-hewan): add hewan detail page with FotoUploader"
```

---

## Task 5: Frontend — HewanCard Photo Display

**Files:**
- Modify: `frontend/app/katalog/components/HewanCard.tsx`

- [ ] **Step 1: Update HewanCard to accept and display foto_url**

Add `foto_url?: string | null` to the props interface and show the photo at the top of the card when present:

```tsx
interface HewanCardProps {
  kelas:           string
  jenis:           string
  harga_jual:      number
  jumlah_tersedia: number
  foto_url?:       string | null
  onOrder:         () => void
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

export function HewanCard({ kelas, jenis, harga_jual, jumlah_tersedia, foto_url, onOrder }: HewanCardProps) {
  const habis = jumlah_tersedia === 0

  return (
    <div className={`rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden ${habis ? 'opacity-60' : ''}`}>
      {foto_url ? (
        <img src={foto_url} alt={`${kelas} ${jenis}`} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
          <span className="text-4xl">🐄</span>
        </div>
      )}
      <div className="p-5 flex flex-col gap-3 flex-1">
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
    </div>
  )
}
```

- [ ] **Step 2: Update KatalogContent.tsx to pass foto_url**

In `frontend/app/katalog/components/KatalogContent.tsx`, update the `CatalogItem` interface and the `HewanCard` usage:

Find the `CatalogItem` interface:
```tsx
interface CatalogItem {
  kelas:           string
  jenis:           string
  harga_jual:      number
  jumlah_tersedia: number
}
```

Change to:
```tsx
interface CatalogItem {
  kelas:           string
  jenis:           string
  harga_jual:      number
  jumlah_tersedia: number
  foto_url:        string | null
}
```

Find the `<HewanCard` usage and add `foto_url`:
```tsx
          <HewanCard
            key={i}
            kelas={item.kelas}
            jenis={item.jenis}
            harga_jual={item.harga_jual}
            jumlah_tersedia={item.jumlah_tersedia}
            foto_url={item.foto_url}
            onOrder={() => setSelectedItem(item)}
          />
```

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/katalog/components/HewanCard.tsx" \
        "frontend/app/katalog/components/KatalogContent.tsx"
git commit -m "feat(foto-hewan): update HewanCard to show foto + KatalogContent CatalogItem foto_url"
```

---

## Task 6: Verification + Close T-15

**Files:**
- Modify: `docs/tasks/T-15-upload-foto-hewan.md`
- Modify: `docs/TASKS.md`

- [ ] **Step 1: Run backend tests**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Hewan/FotoHewanTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 9 tests PASS.

- [ ] **Step 2: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -5
```

Expected: no output.

- [ ] **Step 3: Smoke test checklist**

- [ ] `/depot/pengadaan/{id}` (Detail link from pengadaan page) loads hewan info
- [ ] "Upload Foto" button opens file picker
- [ ] Upload JPG → photo appears in grid
- [ ] Delete button (hover) removes photo
- [ ] Max 2 photos enforced (button hidden when 2 exist)
- [ ] `/katalog?depot=1` shows photo in HewanCard when available, placeholder when not

- [ ] **Step 4: Update T-15 task doc**

In `docs/tasks/T-15-upload-foto-hewan.md`:
- `**Status:** \`TODO\`` → `**Status:** \`DONE\``
- All `- [ ]` in Acceptance Criteria → `- [x]`
- All `- [ ]` in Technical Tasks → `- [x]`
- Add to Notes: "Server-side image compression (sharp equivalent) deferred — images stored as-is (validated ≤5MB). Storage uses Laravel public disk (local filesystem for dev)."

- [ ] **Step 5: Update TASKS.md**

- T-15 row: `⬜ TODO` → `✅ DONE`
- Phase 2 progress: `6 / 10` → `7 / 10`
- Summary: Phase 2 Selesai `6→7`, Sisa `4→3`; TOTAL Selesai `14→15`, Sisa `11→10`

- [ ] **Step 6: Commit + tag**

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-15-upload-foto-hewan.md docs/TASKS.md
git commit -m "docs: mark T-15 Upload Foto Hewan as DONE"
git tag t-15-complete
```

---

## Acceptance Criteria Checklist

- [ ] Upload 1–2 foto per hewan (max 2 enforced server-side + client-side)
- [ ] Format: JPG, JPEG, PNG only
- [ ] Ukuran maks 5MB (validated via `max:5120` in Laravel)
- [ ] Foto tampil di katalog web `/katalog` via `foto_url` field
- [ ] Bisa hapus foto (DELETE endpoint + trash button on hover)
- [ ] Thumbnail di halaman detail hewan `/depot/pengadaan/[id]`
- [ ] All 9 backend tests pass
- [ ] TypeScript clean
