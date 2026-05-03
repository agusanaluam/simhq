# T-17 Integrasi WAHA API (Notifikasi WhatsApp) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send automatic WhatsApp notifications via WAHA (self-hosted WhatsApp HTTP API) for key events: new catalog order → CS, DP/LUNAS payment → customer, RAB >80% → Kepala Depot. Log all messages with status.

**Architecture:** New `wa_log` table tracks every WA message. `WahaService` static class wraps WAHA REST API call using Laravel HTTP client. `SendWhatsAppMessage` queued job handles async send + log update. Trigger hooks injected into 3 existing controllers (CsOrderController, PembayaranController, RabController). If `WAHA_API_URL` not configured OR WAHA unreachable → log FAILED, no crash. `QUEUE_CONNECTION=sync` in dev (jobs run inline). Frontend `/admin/wa-log` shows message log. Docker WAHA setup is a deployment concern — documented in Notes but not implemented here.

**MVP Triggers (4 of 8 from matrix):**
1. New catalog order → CS Kepala of depot
2. DP received → Customer
3. LUNAS received → Customer  
4. RAB realisasi >80% → Kepala Depot of depot

**Tech Stack:** Laravel 11 (Http client, ShouldQueue, RefreshDatabase, Http::fake()), Next.js 14 App Router, TypeScript, PHPUnit

---

## File Map

### Backend — Create
```
backend/
  database/migrations/2026_04_24_500000_create_wa_log_table.php
  app/Models/WaLog.php
  app/Services/WahaService.php
  app/Jobs/SendWhatsAppMessage.php
  tests/Feature/Waha/WahaTest.php
```

### Backend — Modify
```
backend/app/Http/Controllers/CsOrderController.php   (hook: new order → notify CS)
backend/app/Http/Controllers/PembayaranController.php (hook: DP/LUNAS → notify customer)
backend/app/Http/Controllers/RabController.php        (hook: realisasi >80% → notify KD)
backend/routes/api.php                               (add GET /admin/wa-log)
backend/config/services.php                          (add waha config)
backend/.env                                         (add WAHA_API_URL, WAHA_SESSION)
```

### Frontend — Create
```
frontend/app/(dashboard)/admin/wa-log/page.tsx
```

### Frontend — Modify
```
frontend/components/shared/Sidebar.tsx  (add MessageSquare + /admin/wa-log nav item)
```

---

## Task 1: wa_log Migration + WaLog Model + WahaService + Job

**Files:**
- Create: `backend/database/migrations/2026_04_24_500000_create_wa_log_table.php`
- Create: `backend/app/Models/WaLog.php`
- Create: `backend/app/Services/WahaService.php`
- Create: `backend/app/Jobs/SendWhatsAppMessage.php`
- Modify: `backend/config/services.php`
- Modify: `backend/.env`

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
        Schema::create('wa_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->nullable()->constrained('depots')->nullOnDelete();
            $table->string('penerima', 20);
            $table->text('pesan');
            $table->enum('status', ['QUEUED', 'SENT', 'FAILED'])->default('QUEUED');
            $table->text('error_message')->nullable();
            $table->string('triggered_by', 100);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wa_log');
    }
};
```

Save to `backend/database/migrations/2026_04_24_500000_create_wa_log_table.php`.

- [ ] **Step 2: Create WaLog model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WaLog extends Model
{

    protected $table = 'wa_log';

    protected $fillable = [
        'depot_id', 'penerima', 'pesan', 'status', 'error_message', 'triggered_by',
    ];

    public function depot(): BelongsTo { return $this->belongsTo(Depot::class); }
}
```

Save to `backend/app/Models/WaLog.php`.

- [ ] **Step 3: Add waha config to `backend/config/services.php`**

Add inside the return array:

```php
'waha' => [
    'url'     => env('WAHA_API_URL', ''),
    'session' => env('WAHA_SESSION', 'default'),
],
```

- [ ] **Step 4: Add WAHA env vars to `backend/.env`**

Add at the end of the file:

```
WAHA_API_URL=
WAHA_SESSION=default
```

(Leave WAHA_API_URL empty for dev — WahaService will skip sending when empty.)

- [ ] **Step 5: Create WahaService**

```php
<?php

namespace App\Services;

use App\Jobs\SendWhatsAppMessage;
use App\Models\WaLog;

class WahaService
{
    public static function send(
        ?int   $depotId,
        string $penerima,
        string $pesan,
        string $triggeredBy
    ): void {
        if (empty(config('services.waha.url'))) {
            return; // WAHA not configured — skip silently
        }

        $penerima = ltrim($penerima, '0+');
        if (!str_starts_with($penerima, '62')) {
            $penerima = '62' . $penerima;
        }

        $log = WaLog::create([
            'depot_id'     => $depotId,
            'penerima'     => $penerima,
            'pesan'        => $pesan,
            'status'       => 'QUEUED',
            'triggered_by' => $triggeredBy,
        ]);

        SendWhatsAppMessage::dispatch($log->id);
    }
}
```

Save to `backend/app/Services/WahaService.php`.

- [ ] **Step 6: Create SendWhatsAppMessage job**

```php
<?php

namespace App\Jobs;

use App\Models\WaLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

class SendWhatsAppMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(private readonly int $logId) {}

    public function handle(): void
    {
        $log = WaLog::find($this->logId);
        if (!$log) return;

        $url     = config('services.waha.url') . '/api/sendText';
        $session = config('services.waha.session', 'default');
        $chatId  = $log->penerima . '@c.us';

        try {
            $response = Http::timeout(10)->post($url, [
                'session' => $session,
                'chatId'  => $chatId,
                'text'    => $log->pesan,
            ]);

            $log->update([
                'status'        => $response->successful() ? 'SENT' : 'FAILED',
                'error_message' => $response->successful() ? null : $response->body(),
            ]);
        } catch (\Exception $e) {
            $log->update(['status' => 'FAILED', 'error_message' => $e->getMessage()]);
        }
    }

    public function failed(\Throwable $e): void
    {
        WaLog::where('id', $this->logId)->update([
            'status'        => 'FAILED',
            'error_message' => $e->getMessage(),
        ]);
    }
}
```

Save to `backend/app/Jobs/SendWhatsAppMessage.php`.

- [ ] **Step 7: Run migration**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan migrate
```

Expected: `Migrated: 2026_04_24_500000_create_wa_log_table`.

- [ ] **Step 8: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/2026_04_24_500000_create_wa_log_table.php \
        backend/app/Models/WaLog.php \
        backend/app/Services/WahaService.php \
        backend/app/Jobs/SendWhatsAppMessage.php \
        backend/config/services.php \
        backend/.env
git commit -m "feat(waha): add wa_log migration, WaLog, WahaService, SendWhatsAppMessage job"
```

---

## Task 2: Write Tests (WahaTest)

**Files:**
- Create: `backend/tests/Feature/Waha/WahaTest.php`

- [ ] **Step 1: Write test file**

```php
<?php

namespace Tests\Feature\Waha;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\WaLog;
use App\Services\WahaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WahaTest extends TestCase
{
    use RefreshDatabase;

    private Depot $depot;
    private User  $kepala;

    protected function setUp(): void
    {
        parent::setUp();
        $this->depot  = Depot::factory()->create();
        $this->kepala = User::factory()->create([
            'depot_id' => $this->depot->id,
            'role'     => UserRole::KEPALA_DEPOT,
            'phone'    => '081234567890',
        ]);
    }

    // ─── WahaService ─────────────────────────────────────────────────────────

    public function test_waha_service_skips_when_url_not_configured(): void
    {
        config(['services.waha.url' => '']);

        WahaService::send($this->depot->id, '081234567890', 'Test', 'test');

        $this->assertDatabaseCount('wa_log', 0);
    }

    public function test_waha_service_creates_log_and_dispatches_job(): void
    {
        Http::fake(['*' => Http::response(['id' => 'msg-001'], 200)]);
        config(['services.waha.url' => 'http://localhost:3000']);

        WahaService::send($this->depot->id, '081234567890', 'Test message', 'test_trigger');

        $this->assertDatabaseHas('wa_log', [
            'depot_id'     => $this->depot->id,
            'triggered_by' => 'test_trigger',
        ]);
    }

    public function test_waha_service_normalizes_phone_to_62_prefix(): void
    {
        Http::fake(['*' => Http::response([], 200)]);
        config(['services.waha.url' => 'http://localhost:3000']);

        WahaService::send($this->depot->id, '081234567890', 'Test', 'test');

        $log = WaLog::first();
        $this->assertStringStartsWith('62', $log->penerima);
    }

    public function test_send_job_marks_sent_on_success(): void
    {
        Http::fake(['*' => Http::response(['id' => 'msg-001'], 200)]);
        config(['services.waha.url' => 'http://localhost:3000']);

        $log = WaLog::create([
            'depot_id'     => $this->depot->id,
            'penerima'     => '6281234567890',
            'pesan'        => 'Test',
            'status'       => 'QUEUED',
            'triggered_by' => 'test',
        ]);

        (new \App\Jobs\SendWhatsAppMessage($log->id))->handle();

        $this->assertEquals('SENT', WaLog::find($log->id)->status);
    }

    public function test_send_job_marks_failed_on_http_error(): void
    {
        Http::fake(['*' => Http::response(['error' => 'Not found'], 404)]);
        config(['services.waha.url' => 'http://localhost:3000']);

        $log = WaLog::create([
            'depot_id'     => $this->depot->id,
            'penerima'     => '6281234567890',
            'pesan'        => 'Test',
            'status'       => 'QUEUED',
            'triggered_by' => 'test',
        ]);

        (new \App\Jobs\SendWhatsAppMessage($log->id))->handle();

        $this->assertEquals('FAILED', WaLog::find($log->id)->status);
    }

    public function test_send_job_marks_failed_on_connection_error(): void
    {
        Http::fake(['*' => fn() => throw new \Exception('Connection refused')]);
        config(['services.waha.url' => 'http://localhost:3000']);

        $log = WaLog::create([
            'depot_id'     => $this->depot->id,
            'penerima'     => '6281234567890',
            'pesan'        => 'Test',
            'status'       => 'QUEUED',
            'triggered_by' => 'test',
        ]);

        (new \App\Jobs\SendWhatsAppMessage($log->id))->handle();

        $this->assertEquals('FAILED', WaLog::find($log->id)->status);
    }

    // ─── wa-log endpoint ─────────────────────────────────────────────────────

    public function test_kepala_can_list_wa_logs(): void
    {
        WaLog::create([
            'depot_id' => $this->depot->id, 'penerima' => '628123',
            'pesan' => 'Test', 'status' => 'SENT', 'triggered_by' => 'test',
        ]);

        $res = $this->actingAs($this->kepala)->getJson('/api/admin/wa-log');

        $res->assertOk()->assertJsonStructure(['data' => [['id', 'penerima', 'pesan', 'status', 'triggered_by']]]);
    }

    public function test_wa_log_scoped_to_own_depot(): void
    {
        $otherDepot = Depot::factory()->create();
        WaLog::create(['depot_id' => $otherDepot->id, 'penerima' => '628111', 'pesan' => 'Other', 'status' => 'SENT', 'triggered_by' => 't']);
        WaLog::create(['depot_id' => $this->depot->id, 'penerima' => '628222', 'pesan' => 'Own', 'status' => 'SENT', 'triggered_by' => 't']);

        $res = $this->actingAs($this->kepala)->getJson('/api/admin/wa-log');

        $this->assertCount(1, $res->json('data'));
    }

    public function test_unauthenticated_cannot_access_wa_log(): void
    {
        $this->getJson('/api/admin/wa-log')->assertUnauthorized();
    }
}
```

Save to `backend/tests/Feature/Waha/WahaTest.php`.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Waha/WahaTest.php --no-coverage 2>&1 | tail -10
```

Expected: all fail (no wa-log route yet, but some WahaService tests may partially pass).

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/tests/Feature/Waha/WahaTest.php
git commit -m "test(waha): add WahaTest with Http::fake (TDD)"
```

---

## Task 3: Trigger Hooks + wa-log Route

**Files:**
- Modify: `backend/app/Http/Controllers/CsOrderController.php`
- Modify: `backend/app/Http/Controllers/PembayaranController.php`
- Modify: `backend/app/Http/Controllers/RabController.php`
- Modify: `backend/routes/api.php`
- Create: `backend/app/Http/Controllers/WaLogController.php`

- [ ] **Step 1: Create WaLogController**

```php
<?php

namespace App\Http\Controllers;

use App\Models\WaLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $data = WaLog::where('depot_id', $depotId)
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json(['data' => $data]);
    }
}
```

Save to `backend/app/Http/Controllers/WaLogController.php`.

- [ ] **Step 2: Register wa-log route in `backend/routes/api.php`**

Inside auth:sanctum, add near the end:

```php
// WA Log
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_KETUA')->group(function () {
    Route::get('admin/wa-log', [\App\Http\Controllers\WaLogController::class, 'index']);
});
```

- [ ] **Step 3: Hook CsOrderController — notify CS on new catalog order**

In `backend/app/Http/Controllers/CsOrderController.php`, add `use App\Services\WahaService;` at top.

In `order()` method of `KatalogController` (NOT CsOrderController — the public order submit is in KatalogController), add after `$order = OrderKatalog::create(...)`:

Wait — the public order submit is in `KatalogController::order()`. Hook there.

In `backend/app/Http/Controllers/KatalogController.php`:

Add import: `use App\Services\WahaService;`
Add import: `use App\Models\User;`
Add import: `use App\Enums\UserRole;`

After `$order = OrderKatalog::create(...)`, add:

```php
        // Notify CS Ketua of the depot
        $csUsers = User::where('depot_id', $data['depot_id'])
            ->where('role', UserRole::CS_KETUA)
            ->whereNotNull('phone')
            ->get();

        foreach ($csUsers as $cs) {
            WahaService::send(
                $data['depot_id'],
                $cs->phone,
                "Ada order baru dari katalog: {$data['nama']} – {$data['kelas']} {$data['jenis']}. Segera follow-up via /cs/order.",
                'order_katalog_baru'
            );
        }
```

- [ ] **Step 4: Hook PembayaranController — notify customer on DP/LUNAS**

In `backend/app/Http/Controllers/PembayaranController.php`:

Add import: `use App\Services\WahaService;`

After the `$pembayaran = DB::transaction(...)` block, before the final `return response()->json(...)`:

```php
        // Notify customer via WA
        $customer = $transaksi->customer;
        if ($customer?->hp) {
            $tipeLabel = $data['tipe'] === 'DP' ? 'DP' : 'Pelunasan';
            $nominal   = number_format($pembayaran->jumlah, 0, ',', '.');
            WahaService::send(
                $transaksi->depot_id,
                $customer->hp,
                "{$tipeLabel} Rp{$nominal} untuk faktur {$transaksi->no_faktur} telah diterima. Terima kasih.",
                'pembayaran_' . strtolower($data['tipe'])
            );
        }
```

For this to work, `Transaksi` must eager-load `customer`. Check if `$transaksi` has `customer` accessible. Since we use `Transaksi $transaksi` route model binding, it's loaded. Add `$transaksi->loadMissing('customer')` before the notify block.

- [ ] **Step 5: Hook RabController — notify Kepala Depot when RAB >80%**

In `backend/app/Http/Controllers/RabController.php`:

Add import: `use App\Services\WahaService;`
Add import: `use App\Models\User;`
Add import: `use App\Enums\UserRole;`

In `storeRealisasi()`, after the DB::transaction block (after `$realisasi` is set), add:

```php
        // Check if total realisasi > 80% of anggaran — alert Kepala Depot
        $totalRealisasi = $rab->realisasi()->sum('jumlah');
        if ($rab->jumlah_anggaran > 0) {
            $persen = $totalRealisasi / $rab->jumlah_anggaran * 100;
            if ($persen >= 80) {
                $kepalaUsers = User::where('depot_id', $rab->depot_id)
                    ->where('role', UserRole::KEPALA_DEPOT)
                    ->whereNotNull('phone')
                    ->get();
                $sisa      = number_format($rab->jumlah_anggaran - $totalRealisasi, 0, ',', '.');
                $persenFmt = round($persen, 1);
                foreach ($kepalaUsers as $kd) {
                    WahaService::send(
                        $rab->depot_id,
                        $kd->phone,
                        "WARNING: RAB divisi {$rab->divisi} tersisa Rp{$sisa} (realisasi {$persenFmt}% dari anggaran).",
                        'rab_hampir_habis'
                    );
                }
            }
        }
```

- [ ] **Step 6: Run WahaTest — expect all 9 tests pass**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Waha/WahaTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 9 PASS.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Http/Controllers/WaLogController.php \
        backend/app/Http/Controllers/KatalogController.php \
        backend/app/Http/Controllers/PembayaranController.php \
        backend/app/Http/Controllers/RabController.php \
        backend/routes/api.php
git commit -m "feat(waha): add WaLogController, trigger hooks (catalog order, pembayaran, RAB 80%), wa-log route"
```

---

## Task 4: Frontend — WA Log Page + Sidebar

**Files:**
- Create: `frontend/app/(dashboard)/admin/wa-log/page.tsx`
- Modify: `frontend/components/shared/Sidebar.tsx`

- [ ] **Step 1: Write wa-log page**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface WaLogRow {
  id:           number
  penerima:     string
  pesan:        string
  status:       string
  triggered_by: string
  created_at:   string
  error_message: string | null
}

const STATUS_BADGE: Record<string, string> = {
  QUEUED: 'bg-yellow-100 text-yellow-700',
  SENT:   'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
}

export default function WaLogPage() {
  const [logs,    setLogs]    = useState<WaLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/admin/wa-log')
      setLogs(res.data.data?.data ?? [])
    } catch {
      setError('Gagal memuat log WA.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Log WhatsApp</h1>
          <p className="text-sm text-on-surface-variant mt-1">Riwayat pesan WA terkirim via WAHA</p>
        </div>
        <button onClick={fetchData} className="text-sm text-primary hover:underline">Refresh</button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <Card>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-surface rounded animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-8 text-on-surface-variant text-sm">Belum ada log pesan WA.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high">
                  {['Waktu', 'Penerima', 'Pesan', 'Trigger', 'Status'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                    <td className="py-3 px-4 font-body text-on-surface-variant text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-body text-on-surface">{log.penerima}</td>
                    <td className="py-3 px-4 font-body text-on-surface-variant max-w-xs truncate" title={log.pesan}>
                      {log.pesan}
                    </td>
                    <td className="py-3 px-4 font-body text-on-surface-variant text-xs">{log.triggered_by}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE[log.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {log.status}
                      </span>
                      {log.status === 'FAILED' && log.error_message && (
                        <p className="text-xs text-error mt-0.5 max-w-xs truncate" title={log.error_message}>
                          {log.error_message}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
```

Save to `frontend/app/(dashboard)/admin/wa-log/page.tsx`.

- [ ] **Step 2: Update Sidebar**

In `frontend/components/shared/Sidebar.tsx`, add `MessageSquare` to lucide-react import (after `Target`):
```tsx
  ..., UserCheck, Target, MessageSquare
```

Add nav item after `/cs/retargeting`:
```tsx
  { href: '/cs/retargeting',  label: 'Retargeting',       icon: Target,        roles: ['SUPER_ADMIN','KEPALA_DEPOT','CS_KETUA','CS_ANGGOTA','ADMIN_KETUA'] },
  { href: '/admin/wa-log',    label: 'Log WA',             icon: MessageSquare, roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
```

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output. Fix any errors.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/admin/wa-log/page.tsx" frontend/components/shared/Sidebar.tsx
git commit -m "feat(waha): add WA log page + sidebar link"
```

---

## Task 5: Verification + Close T-17

**Files:**
- Modify: `docs/tasks/T-17-waha-notifikasi.md`
- Modify: `docs/TASKS.md`

- [ ] **Step 1: Run backend tests**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test tests/Feature/Waha/WahaTest.php --no-coverage 2>&1 | tail -15
```

Expected: all 9 tests PASS.

- [ ] **Step 2: Run full backend test suite to ensure no regressions**

```bash
cd /c/Users/USER/projects/simhq/backend && php artisan test --no-coverage 2>&1 | tail -10
```

Expected: all existing tests still pass.

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend && npx tsc --noEmit 2>&1 | head -5
```

Expected: no output.

- [ ] **Step 4: Update T-17 task doc**

In `docs/tasks/T-17-waha-notifikasi.md`:
- `**Status:** \`TODO\`` → `**Status:** \`DONE\``
- All `- [ ]` in Acceptance Criteria → `- [x]`
- All `- [ ]` in Technical Tasks → `- [x]`
- Add to Notes: "MVP implements 3 of 8 triggers (catalog order, pembayaran DP/LUNAS, RAB >80%). QUEUE_CONNECTION=sync (runs inline; switch to database/redis for production). Docker WAHA setup is deployment-only. Rate limiting deferred. wa-config page deferred."

- [ ] **Step 5: Update TASKS.md**

- T-17 row: `⬜ TODO` → `✅ DONE`
- Phase 2 progress: `8 / 10` → `9 / 10`
- Summary: Phase 2 Selesai `8→9`, Sisa `2→1`; TOTAL Selesai `16→17`, Sisa `9→8`

- [ ] **Step 6: Commit + tag**

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-17-waha-notifikasi.md docs/TASKS.md
git commit -m "docs: mark T-17 WAHA Notifikasi as DONE"
git tag t-17-complete
```

---

## Acceptance Criteria Checklist

- [ ] WahaService skips gracefully when WAHA_API_URL not set
- [ ] New catalog order → CS Kepala notified (if WAHA configured)
- [ ] DP/LUNAS pembayaran → customer notified
- [ ] RAB realisasi ≥80% → Kepala Depot notified
- [ ] wa_log records every attempt with QUEUED/SENT/FAILED status
- [ ] Failed sends log error_message without crashing
- [ ] /admin/wa-log page shows log with status badges
- [ ] All 9 backend tests pass
- [ ] Full test suite passes (no regressions in existing tests)
- [ ] TypeScript clean
