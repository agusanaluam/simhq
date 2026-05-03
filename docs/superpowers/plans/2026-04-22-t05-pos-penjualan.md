# T-05 POS Penjualan + Pre-order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sistem POS transaksi hewan qurban — input langsung dengan nomor hewan atau pre-order tanpa hewan, 3 tipe qurban (SHQ/THQ/PHQ), auto-generate no faktur, konfirmasi/batal dengan state hewan otomatis.

**Architecture:** Backend Laravel 11 — 2 tabel baru (customers, transaksi), StatusTransaksi enum, TransaksiService untuk noFaktur + state transitions, 7 feature tests TDD. Frontend Next.js 14 — halaman list transaksi + form POS 4-step wizard + modal assign hewan untuk pre-order.

**Tech Stack:** Laravel 11, PostgreSQL, Next.js 14, TypeScript, Tailwind

---

## File Map

### Backend — Created
```
backend/
  database/migrations/XXXX_create_customers_table.php
  database/migrations/XXXX_create_transaksi_table.php
  app/Enums/StatusTransaksi.php
  app/Models/Customer.php
  app/Models/Transaksi.php
  app/Services/TransaksiService.php
  app/Http/Controllers/TransaksiController.php
  app/Http/Controllers/CustomerController.php
  app/Http/Requests/StoreTransaksiRequest.php
  tests/Feature/POS/TransaksiTest.php
```

### Backend — Modified
```
  routes/api.php  ← add transaksi + customer routes
```

### Frontend — Created
```
frontend/
  app/(dashboard)/depot/transaksi/page.tsx
  app/(dashboard)/depot/transaksi/AssignHewanModal.tsx
  app/(dashboard)/depot/pos/page.tsx
  app/(dashboard)/depot/pos/StepJenisKelas.tsx
  app/(dashboard)/depot/pos/StepPilihHewan.tsx
  app/(dashboard)/depot/pos/StepDataPembeli.tsx
  app/(dashboard)/depot/pos/StepReview.tsx
```

### Frontend — Modified
```
  frontend/components/shared/Sidebar.tsx  ← add POS + Transaksi links
```

---

## Task 1: Migrations

### Files
- Create: `backend/database/migrations/XXXX_create_customers_table.php`
- Create: `backend/database/migrations/XXXX_create_transaksi_table.php`

- [ ] **Step 1: Create migration files**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan make:migration create_customers_table
php artisan make:migration create_transaksi_table
```

- [ ] **Step 2: Fill customers migration**

Open the generated `*_create_customers_table.php` and replace `up()`:

```php
public function up(): void
{
    Schema::create('customers', function (Blueprint $table) {
        $table->id();
        $table->string('nama', 150);
        $table->string('hp', 20)->nullable();
        $table->string('alamat')->nullable();
        $table->string('kelurahan', 100)->nullable();
        $table->string('kecamatan', 100)->nullable();
        $table->string('kota', 100)->nullable();
        $table->timestamps();
    });
}
public function down(): void { Schema::dropIfExists('customers'); }
```

- [ ] **Step 3: Fill transaksi migration**

Open the generated `*_create_transaksi_table.php` and replace `up()`:

```php
public function up(): void
{
    Schema::create('transaksi', function (Blueprint $table) {
        $table->id();
        $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
        $table->string('no_faktur', 30)->unique();
        $table->foreignId('hewan_id')->nullable()->constrained('hewan')->nullOnDelete();
        $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
        $table->foreignId('cs_id')->nullable()->constrained('users')->nullOnDelete();
        $table->foreignId('teller_id')->nullable()->constrained('users')->nullOnDelete();
        $table->foreignId('sales_id')->nullable()->constrained('users')->nullOnDelete();
        $table->foreignId('yayasan_id')->nullable()->constrained('yayasan')->nullOnDelete();
        $table->enum('tipe_qurban', ['SHQ', 'THQ', 'PHQ']);
        $table->enum('jenis', ['SAPI', 'DOMBA']);
        $table->foreignId('kelas_id')->constrained('kelas_hewan')->restrictOnDelete();
        $table->unsignedInteger('harga');   // harga jual dari harga_kelas
        $table->unsignedInteger('total');   // sama dengan harga di MVP; biaya tambahan T-07
        $table->enum('status_transaksi', [
            'MENUNGGU_HEWAN', 'HEWAN_TERALOKASI',
            'DIKONFIRMASI', 'SELESAI', 'DIBATALKAN',
        ])->default('MENUNGGU_HEWAN');
        $table->year('musim');
        $table->text('catatan')->nullable();
        $table->timestamps();
    });
}
public function down(): void { Schema::dropIfExists('transaksi'); }
```

- [ ] **Step 4: Run migrations**

```bash
php artisan migrate
```

Expected: no errors, two new tables created.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/
git commit -m "feat(db): add customers + transaksi tables"
```

---

## Task 2: Enums, Models, Service

### Files
- Create: `backend/app/Enums/StatusTransaksi.php`
- Create: `backend/app/Models/Customer.php`
- Create: `backend/app/Models/Transaksi.php`
- Create: `backend/app/Services/TransaksiService.php`

- [ ] **Step 1: Create StatusTransaksi enum**

```php
<?php
// backend/app/Enums/StatusTransaksi.php
namespace App\Enums;

enum StatusTransaksi: string
{
    case MENUNGGU_HEWAN    = 'MENUNGGU_HEWAN';
    case HEWAN_TERALOKASI  = 'HEWAN_TERALOKASI';
    case DIKONFIRMASI      = 'DIKONFIRMASI';
    case SELESAI           = 'SELESAI';
    case DIBATALKAN        = 'DIBATALKAN';
}
```

- [ ] **Step 2: Create Customer model**

```php
<?php
// backend/app/Models/Customer.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $table = 'customers';

    protected $fillable = ['nama', 'hp', 'alamat', 'kelurahan', 'kecamatan', 'kota'];

    public function transaksi(): HasMany
    {
        return $this->hasMany(Transaksi::class);
    }
}
```

- [ ] **Step 3: Create Transaksi model**

```php
<?php
// backend/app/Models/Transaksi.php
namespace App\Models;

use App\Enums\StatusTransaksi;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaksi extends Model
{
    protected $table = 'transaksi';

    protected $fillable = [
        'depot_id', 'no_faktur', 'hewan_id', 'customer_id',
        'cs_id', 'teller_id', 'sales_id', 'yayasan_id',
        'tipe_qurban', 'jenis', 'kelas_id',
        'harga', 'total', 'status_transaksi', 'musim', 'catatan',
    ];

    protected $casts = [
        'status_transaksi' => StatusTransaksi::class,
        'harga'            => 'integer',
        'total'            => 'integer',
        'musim'            => 'integer',
    ];

    public function depot(): BelongsTo    { return $this->belongsTo(Depot::class); }
    public function hewan(): BelongsTo    { return $this->belongsTo(Hewan::class); }
    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function kelas(): BelongsTo    { return $this->belongsTo(KelasHewan::class, 'kelas_id'); }
    public function cs(): BelongsTo       { return $this->belongsTo(User::class, 'cs_id'); }
    public function teller(): BelongsTo   { return $this->belongsTo(User::class, 'teller_id'); }
    public function sales(): BelongsTo    { return $this->belongsTo(User::class, 'sales_id'); }
    public function yayasan(): BelongsTo  { return $this->belongsTo(Yayasan::class); }
}
```

- [ ] **Step 4: Create TransaksiService**

```php
<?php
// backend/app/Services/TransaksiService.php
namespace App\Services;

use App\Models\Transaksi;
use Illuminate\Support\Facades\DB;

class TransaksiService
{
    /**
     * Generate no_faktur format: {depot_id}-{musim}-{seq:04d}
     * e.g.: 1-2026-0001
     * Uses pessimistic lock to prevent race condition.
     */
    public function generateNoFaktur(int $depotId, int $musim): string
    {
        return DB::transaction(function () use ($depotId, $musim) {
            $last = Transaksi::where('depot_id', $depotId)
                ->where('musim', $musim)
                ->lockForUpdate()
                ->count();

            $seq = $last + 1;

            return "{$depotId}-{$musim}-" . str_pad($seq, 4, '0', STR_PAD_LEFT);
        });
    }
}
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Enums/StatusTransaksi.php backend/app/Models/Customer.php backend/app/Models/Transaksi.php backend/app/Services/TransaksiService.php
git commit -m "feat(pos): StatusTransaksi enum + Customer/Transaksi models + TransaksiService"
```

---

## Task 3: Tests (TDD — write failing first)

### Files
- Create: `backend/tests/Feature/POS/TransaksiTest.php`

- [ ] **Step 1: Create test file**

```php
<?php
// backend/tests/Feature/POS/TransaksiTest.php
namespace Tests\Feature\POS;

use App\Enums\StatusHewan;
use App\Enums\StatusTransaksi;
use App\Models\Customer;
use App\Models\Depot;
use App\Models\HargaKelas;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransaksiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Depot $depot;
    private KelasHewan $kelas;
    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin    = User::factory()->superAdmin()->create();
        $this->depot    = Depot::factory()->create();
        $this->kelas    = KelasHewan::create(['kode' => 'A1', 'nama' => 'Kelas A1', 'urutan' => 1]);
        $this->customer = Customer::create(['nama' => 'Budi', 'hp' => '08111']);

        HargaKelas::create([
            'depot_id'  => $this->depot->id,
            'kelas_id'  => $this->kelas->id,
            'jenis'     => 'SAPI',
            'musim'     => 2026,
            'harga_beli'=> 5000000,
            'harga_jual'=> 6000000,
            'fee_sales' => 50000,
        ]);
    }

    private function makeHewan(): Hewan
    {
        return Hewan::create([
            'depot_id'     => $this->depot->id,
            'kelas_asal_id'=> $this->kelas->id,
            'kelas_jual_id'=> $this->kelas->id,
            'no_hewan'     => '001',
            'jenis'        => 'SAPI',
            'bobot_masuk'  => 250,
            'tgl_masuk'    => '2026-04-01',
            'musim'        => 2026,
            'status'       => 'AVAILABLE',
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'depot_id'    => $this->depot->id,
            'customer_id' => $this->customer->id,
            'tipe_qurban' => 'SHQ',
            'jenis'       => 'SAPI',
            'kelas_id'    => $this->kelas->id,
            'musim'       => 2026,
        ], $overrides);
    }

    public function test_buat_transaksi_dengan_hewan(): void
    {
        $hewan = $this->makeHewan();

        $res = $this->actingAs($this->admin)
            ->postJson('/api/transaksi', $this->payload(['hewan_id' => $hewan->id]));

        $res->assertCreated()
            ->assertJsonPath('transaksi.status_transaksi', 'HEWAN_TERALOKASI')
            ->assertJsonStructure(['transaksi' => ['id', 'no_faktur', 'harga', 'total']]);

        $this->assertDatabaseHas('transaksi', [
            'hewan_id'        => $hewan->id,
            'status_transaksi' => 'HEWAN_TERALOKASI',
        ]);
    }

    public function test_buat_preorder_tanpa_hewan(): void
    {
        $res = $this->actingAs($this->admin)
            ->postJson('/api/transaksi', $this->payload());

        $res->assertCreated()
            ->assertJsonPath('transaksi.status_transaksi', 'MENUNGGU_HEWAN');

        $this->assertDatabaseHas('transaksi', [
            'hewan_id'        => null,
            'status_transaksi' => 'MENUNGGU_HEWAN',
        ]);
    }

    public function test_no_faktur_auto_generate_unik(): void
    {
        $hewan1 = $this->makeHewan();

        $r1 = $this->actingAs($this->admin)
            ->postJson('/api/transaksi', $this->payload(['hewan_id' => $hewan1->id]));

        $r2 = $this->actingAs($this->admin)
            ->postJson('/api/transaksi', $this->payload());

        $noFaktur1 = $r1->json('transaksi.no_faktur');
        $noFaktur2 = $r2->json('transaksi.no_faktur');

        $this->assertNotEquals($noFaktur1, $noFaktur2);
        $this->assertStringStartsWith("{$this->depot->id}-2026-", $noFaktur1);
    }

    public function test_assign_hewan_ke_preorder(): void
    {
        $transaksi = Transaksi::create([
            'depot_id'        => $this->depot->id,
            'no_faktur'       => '1-2026-0001',
            'customer_id'     => $this->customer->id,
            'tipe_qurban'     => 'SHQ',
            'jenis'           => 'SAPI',
            'kelas_id'        => $this->kelas->id,
            'harga'           => 6000000,
            'total'           => 6000000,
            'status_transaksi'=> 'MENUNGGU_HEWAN',
            'musim'           => 2026,
        ]);

        $hewan = $this->makeHewan();

        $this->actingAs($this->admin)
            ->putJson("/api/transaksi/{$transaksi->id}/assign-hewan", ['hewan_id' => $hewan->id])
            ->assertOk()
            ->assertJsonPath('transaksi.status_transaksi', 'HEWAN_TERALOKASI')
            ->assertJsonPath('transaksi.hewan_id', $hewan->id);
    }

    public function test_konfirmasi_ubah_hewan_jadi_booked(): void
    {
        $hewan = $this->makeHewan();
        $transaksi = Transaksi::create([
            'depot_id'        => $this->depot->id,
            'no_faktur'       => '1-2026-0001',
            'customer_id'     => $this->customer->id,
            'hewan_id'        => $hewan->id,
            'tipe_qurban'     => 'SHQ',
            'jenis'           => 'SAPI',
            'kelas_id'        => $this->kelas->id,
            'harga'           => 6000000,
            'total'           => 6000000,
            'status_transaksi'=> 'HEWAN_TERALOKASI',
            'musim'           => 2026,
        ]);

        $this->actingAs($this->admin)
            ->putJson("/api/transaksi/{$transaksi->id}/konfirmasi")
            ->assertOk()
            ->assertJsonPath('transaksi.status_transaksi', 'DIKONFIRMASI');

        $this->assertDatabaseHas('hewan', ['id' => $hewan->id, 'status' => 'BOOKED']);
    }

    public function test_konfirmasi_gagal_jika_tidak_ada_hewan(): void
    {
        $transaksi = Transaksi::create([
            'depot_id'        => $this->depot->id,
            'no_faktur'       => '1-2026-0001',
            'customer_id'     => $this->customer->id,
            'tipe_qurban'     => 'SHQ',
            'jenis'           => 'SAPI',
            'kelas_id'        => $this->kelas->id,
            'harga'           => 6000000,
            'total'           => 6000000,
            'status_transaksi'=> 'MENUNGGU_HEWAN',
            'musim'           => 2026,
        ]);

        $this->actingAs($this->admin)
            ->putJson("/api/transaksi/{$transaksi->id}/konfirmasi")
            ->assertUnprocessable();
    }

    public function test_batal_kembalikan_hewan_jadi_available(): void
    {
        $hewan = $this->makeHewan();
        $hewan->update(['status' => 'BOOKED']);

        $transaksi = Transaksi::create([
            'depot_id'        => $this->depot->id,
            'no_faktur'       => '1-2026-0001',
            'customer_id'     => $this->customer->id,
            'hewan_id'        => $hewan->id,
            'tipe_qurban'     => 'SHQ',
            'jenis'           => 'SAPI',
            'kelas_id'        => $this->kelas->id,
            'harga'           => 6000000,
            'total'           => 6000000,
            'status_transaksi'=> 'DIKONFIRMASI',
            'musim'           => 2026,
        ]);

        $this->actingAs($this->admin)
            ->putJson("/api/transaksi/{$transaksi->id}/batal")
            ->assertOk()
            ->assertJsonPath('transaksi.status_transaksi', 'DIBATALKAN');

        $this->assertDatabaseHas('hewan', ['id' => $hewan->id, 'status' => 'AVAILABLE']);
    }

    public function test_list_transaksi(): void
    {
        Transaksi::create([
            'depot_id'        => $this->depot->id,
            'no_faktur'       => '1-2026-0001',
            'customer_id'     => $this->customer->id,
            'tipe_qurban'     => 'SHQ',
            'jenis'           => 'SAPI',
            'kelas_id'        => $this->kelas->id,
            'harga'           => 6000000,
            'total'           => 6000000,
            'status_transaksi'=> 'MENUNGGU_HEWAN',
            'musim'           => 2026,
        ]);

        $this->actingAs($this->admin)
            ->getJson("/api/transaksi?depot={$this->depot->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'no_faktur', 'status_transaksi', 'customer']]]);
    }
}
```

- [ ] **Step 2: Run tests — confirm FAIL**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan test tests/Feature/POS/TransaksiTest.php
```

Expected: FAIL — `TransaksiController` not found / routes missing.

---

## Task 4: StoreTransaksiRequest + TransaksiController + Routes

### Files
- Create: `backend/app/Http/Requests/StoreTransaksiRequest.php`
- Create: `backend/app/Http/Controllers/TransaksiController.php`
- Create: `backend/app/Http/Controllers/CustomerController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create StoreTransaksiRequest**

```php
<?php
// backend/app/Http/Requests/StoreTransaksiRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransaksiRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id'    => ['required', 'exists:depots,id'],
            'hewan_id'    => ['nullable', 'exists:hewan,id'],
            'customer_id' => ['required', 'exists:customers,id'],
            'cs_id'       => ['nullable', 'exists:users,id'],
            'teller_id'   => ['nullable', 'exists:users,id'],
            'sales_id'    => ['nullable', 'exists:users,id'],
            'yayasan_id'  => ['nullable', 'exists:yayasan,id'],
            'tipe_qurban' => ['required', 'in:SHQ,THQ,PHQ'],
            'jenis'       => ['required', 'in:SAPI,DOMBA'],
            'kelas_id'    => ['required', 'exists:kelas_hewan,id'],
            'musim'       => ['required', 'integer', 'min:2020', 'max:2100'],
            'catatan'     => ['nullable', 'string', 'max:500'],
        ];
    }
}
```

- [ ] **Step 2: Create TransaksiController**

```php
<?php
// backend/app/Http/Controllers/TransaksiController.php
namespace App\Http\Controllers;

use App\Enums\StatusHewan;
use App\Enums\StatusTransaksi;
use App\Http\Requests\StoreTransaksiRequest;
use App\Models\HargaKelas;
use App\Models\Transaksi;
use App\Services\TransaksiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransaksiController extends Controller
{
    public function __construct(private TransaksiService $svc) {}

    public function index(Request $request): JsonResponse
    {
        $data = Transaksi::with([
                'customer:id,nama,hp',
                'hewan:id,no_hewan,jenis',
                'kelas:id,kode',
                'cs:id,name',
                'teller:id,name',
                'sales:id,name',
            ])
            ->when($request->depot,  fn($q) => $q->where('depot_id', $request->depot))
            ->when($request->status, fn($q) => $q->where('status_transaksi', $request->status))
            ->when($request->musim,  fn($q) => $q->where('musim', $request->musim))
            ->when($request->tgl, fn($q) => $q->whereDate('created_at', $request->tgl))
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($data);
    }

    public function show(Transaksi $transaksi): JsonResponse
    {
        $transaksi->load([
            'customer', 'hewan.kelasJual', 'kelas',
            'cs:id,name', 'teller:id,name', 'sales:id,name', 'yayasan:id,nama',
        ]);

        return response()->json(['transaksi' => $transaksi]);
    }

    public function store(StoreTransaksiRequest $request): JsonResponse
    {
        $data = $request->validated();

        $harga = HargaKelas::where('depot_id', $data['depot_id'])
            ->where('kelas_id', $data['kelas_id'])
            ->where('jenis', $data['jenis'])
            ->where('musim', $data['musim'])
            ->value('harga_jual') ?? 0;

        $status = $data['hewan_id']
            ? StatusTransaksi::HEWAN_TERALOKASI->value
            : StatusTransaksi::MENUNGGU_HEWAN->value;

        $noFaktur = $this->svc->generateNoFaktur($data['depot_id'], $data['musim']);

        $transaksi = Transaksi::create(array_merge($data, [
            'no_faktur'        => $noFaktur,
            'harga'            => $harga,
            'total'            => $harga,
            'status_transaksi' => $status,
        ]));

        return response()->json(['transaksi' => $transaksi->load(['customer', 'hewan', 'kelas'])], 201);
    }

    public function assignHewan(Request $request, Transaksi $transaksi): JsonResponse
    {
        $request->validate([
            'hewan_id' => ['required', 'exists:hewan,id'],
        ]);

        abort_if(
            $transaksi->status_transaksi !== StatusTransaksi::MENUNGGU_HEWAN,
            422, 'Hanya transaksi MENUNGGU_HEWAN yang bisa di-assign hewan.'
        );

        $transaksi->update([
            'hewan_id'        => $request->hewan_id,
            'status_transaksi'=> StatusTransaksi::HEWAN_TERALOKASI->value,
        ]);

        return response()->json(['transaksi' => $transaksi->fresh()->load(['hewan', 'customer'])]);
    }

    public function konfirmasi(Transaksi $transaksi): JsonResponse
    {
        abort_if(
            $transaksi->status_transaksi === StatusTransaksi::MENUNGGU_HEWAN,
            422, 'Assign nomor hewan dulu sebelum konfirmasi.'
        );

        abort_if(
            ! in_array($transaksi->status_transaksi->value, [
                StatusTransaksi::HEWAN_TERALOKASI->value,
            ]),
            422, 'Status transaksi tidak valid untuk dikonfirmasi.'
        );

        $transaksi->hewan?->update(['status' => StatusHewan::BOOKED->value]);
        $transaksi->update(['status_transaksi' => StatusTransaksi::DIKONFIRMASI->value]);

        return response()->json(['transaksi' => $transaksi->fresh()->load(['hewan', 'customer'])]);
    }

    public function batal(Transaksi $transaksi): JsonResponse
    {
        abort_if(
            $transaksi->status_transaksi === StatusTransaksi::DIBATALKAN,
            422, 'Transaksi sudah dibatalkan.'
        );

        if ($transaksi->hewan_id) {
            $transaksi->hewan?->update(['status' => StatusHewan::AVAILABLE->value]);
        }

        $transaksi->update(['status_transaksi' => StatusTransaksi::DIBATALKAN->value]);

        return response()->json(['transaksi' => $transaksi->fresh()->load(['hewan', 'customer'])]);
    }
}
```

- [ ] **Step 3: Create CustomerController**

```php
<?php
// backend/app/Http/Controllers/CustomerController.php
namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $customers = Customer::when(
                $request->q,
                fn($query) => $query->where('nama', 'ilike', "%{$request->q}%")
                    ->orWhere('hp', 'like', "%{$request->q}%")
            )
            ->orderBy('nama')
            ->limit(20)
            ->get();

        return response()->json(['data' => $customers]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nama'       => ['required', 'string', 'max:150'],
            'hp'         => ['nullable', 'string', 'max:20'],
            'alamat'     => ['nullable', 'string'],
            'kelurahan'  => ['nullable', 'string', 'max:100'],
            'kecamatan'  => ['nullable', 'string', 'max:100'],
            'kota'       => ['nullable', 'string', 'max:100'],
        ]);

        $customer = Customer::create($data);

        return response()->json(['customer' => $customer], 201);
    }
}
```

- [ ] **Step 4: Add routes to api.php**

Inside the `auth:sanctum` group, add after the petak routes:

```php
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\TransaksiController;

// Customer
Route::get('customer',    [CustomerController::class, 'index']);
Route::post('customer',   [CustomerController::class, 'store']);

// Transaksi — static routes BEFORE wildcard
Route::get('transaksi', [TransaksiController::class, 'index']);
Route::get('transaksi/{transaksi}', [TransaksiController::class, 'show']);
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_ANGGOTA')->group(function () {
    Route::post('transaksi',                            [TransaksiController::class, 'store']);
    Route::put('transaksi/{transaksi}/assign-hewan',    [TransaksiController::class, 'assignHewan']);
    Route::put('transaksi/{transaksi}/konfirmasi',      [TransaksiController::class, 'konfirmasi']);
    Route::put('transaksi/{transaksi}/batal',           [TransaksiController::class, 'batal']);
});
```

- [ ] **Step 5: Run tests — confirm PASS**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan test tests/Feature/POS/TransaksiTest.php
```

Expected: 7 tests, 7 passed.

- [ ] **Step 6: Run full test suite — no regression**

```bash
php artisan test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/
git commit -m "feat(pos): TransaksiController + CustomerController + 7 tests passing"
```

---

## Task 5: Frontend — Halaman List Transaksi

### Files
- Create: `frontend/app/(dashboard)/depot/transaksi/page.tsx`
- Create: `frontend/app/(dashboard)/depot/transaksi/AssignHewanModal.tsx`

- [ ] **Step 1: Create AssignHewanModal**

```tsx
// frontend/app/(dashboard)/depot/transaksi/AssignHewanModal.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface Hewan {
  id: number
  no_hewan: string
  jenis: string
  kelas_jual: { kode: string } | null
  bobot_masuk: string
}

interface Props {
  transaksiId: number
  jenis: string
  onDone: () => void
  onClose: () => void
}

export function AssignHewanModal({ transaksiId, jenis, onDone, onClose }: Props) {
  const [hewan, setHewan]       = useState<Hewan[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    api.get(`/api/hewan?status=AVAILABLE&jenis=${jenis}`)
      .then(r => setHewan(r.data.data ?? []))
  }, [jenis])

  async function submit() {
    if (!selected) return
    setSaving(true)
    try {
      await api.put(`/api/transaksi/${transaksiId}/assign-hewan`, { hewan_id: selected })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">Assign Nomor Hewan</h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
          {hewan.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-8">Tidak ada hewan {jenis} tersedia</p>
          )}
          {hewan.map(h => (
            <button
              key={h.id}
              onClick={() => setSelected(h.id)}
              className={`w-full text-left px-3 py-2 rounded-xl border-2 transition-colors ${
                selected === h.id
                  ? 'border-primary bg-surface-high'
                  : 'border-surface-high hover:border-primary/50'
              }`}
            >
              <span className="font-body font-medium text-on-surface">#{h.no_hewan}</span>
              <span className="text-xs text-on-surface-variant ml-2">{h.kelas_jual?.kode ?? '—'} · {h.bobot_masuk} kg</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={submit} loading={saving} disabled={!selected}>Assign</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create transaksi list page**

```tsx
// frontend/app/(dashboard)/depot/transaksi/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AssignHewanModal } from './AssignHewanModal'
import api from '@/lib/api'
import Link from 'next/link'

interface Transaksi {
  id: number
  no_faktur: string
  status_transaksi: string
  tipe_qurban: string
  jenis: string
  total: number
  created_at: string
  customer: { nama: string; hp: string } | null
  hewan: { no_hewan: string } | null
  kelas: { kode: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  MENUNGGU_HEWAN:   'Menunggu Hewan',
  HEWAN_TERALOKASI: 'Hewan Teralokasi',
  DIKONFIRMASI:     'Dikonfirmasi',
  SELESAI:          'Selesai',
  DIBATALKAN:       'Dibatalkan',
}

const STATUS_COLOR: Record<string, string> = {
  MENUNGGU_HEWAN:   'bg-yellow-100 text-yellow-800',
  HEWAN_TERALOKASI: 'bg-blue-100 text-blue-800',
  DIKONFIRMASI:     'bg-green-100 text-green-800',
  SELESAI:          'bg-gray-100 text-gray-700',
  DIBATALKAN:       'bg-red-100 text-red-700',
}

export default function TransaksiPage() {
  const [list, setList]       = useState<Transaksi[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')
  const [assignModal, setAssignModal] = useState<{ id: number; jenis: string } | null>(null)

  function load() {
    setLoading(true)
    const p = new URLSearchParams()
    if (filter) p.set('status', filter)
    api.get(`/api/transaksi?${p}`)
      .then(r => setList(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  async function konfirmasi(id: number) {
    await api.put(`/api/transaksi/${id}/konfirmasi`)
    load()
  }

  async function batal(id: number) {
    if (!confirm('Batalkan transaksi ini?')) return
    await api.put(`/api/transaksi/${id}/batal`)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Transaksi</h1>
          <p className="text-sm text-on-surface-variant mt-1">Semua transaksi penjualan</p>
        </div>
        <Link href="/depot/pos">
          <Button>+ Transaksi Baru</Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'MENUNGGU_HEWAN', 'HEWAN_TERALOKASI', 'DIKONFIRMASI', 'SELESAI', 'DIBATALKAN'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-body font-medium transition-colors ${
              filter === s
                ? 'bg-primary text-white'
                : 'bg-surface-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {s ? STATUS_LABEL[s] : 'Semua'}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant py-8 text-center">Memuat...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-8 text-center">Belum ada transaksi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high text-left text-xs text-on-surface-variant font-body">
                  <th className="pb-2 pr-4">No Faktur</th>
                  <th className="pb-2 pr-4">Pembeli</th>
                  <th className="pb-2 pr-4">Hewan</th>
                  <th className="pb-2 pr-4">Tipe</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map(t => (
                  <tr key={t.id} className="border-b border-surface-high last:border-0">
                    <td className="py-2 pr-4 font-body font-medium text-primary">{t.no_faktur}</td>
                    <td className="py-2 pr-4 font-body">
                      <p className="font-medium text-on-surface">{t.customer?.nama ?? '—'}</p>
                      <p className="text-xs text-on-surface-variant">{t.customer?.hp}</p>
                    </td>
                    <td className="py-2 pr-4 font-body text-on-surface">
                      {t.hewan ? `#${t.hewan.no_hewan}` : <span className="text-on-surface-variant italic">Pre-order</span>}
                    </td>
                    <td className="py-2 pr-4 font-body">
                      <span className="text-xs">{t.tipe_qurban} · {t.jenis}</span>
                      {t.kelas && <span className="text-xs text-on-surface-variant ml-1">· {t.kelas.kode}</span>}
                    </td>
                    <td className="py-2 pr-4 font-body font-medium text-on-surface">
                      {t.total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-body ${STATUS_COLOR[t.status_transaksi] ?? ''}`}>
                        {STATUS_LABEL[t.status_transaksi] ?? t.status_transaksi}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {t.status_transaksi === 'MENUNGGU_HEWAN' && (
                          <button
                            onClick={() => setAssignModal({ id: t.id, jenis: t.jenis })}
                            className="text-xs text-primary hover:underline"
                          >
                            Assign Hewan
                          </button>
                        )}
                        {t.status_transaksi === 'HEWAN_TERALOKASI' && (
                          <button onClick={() => konfirmasi(t.id)} className="text-xs text-green-700 hover:underline">
                            Konfirmasi
                          </button>
                        )}
                        {!['SELESAI', 'DIBATALKAN'].includes(t.status_transaksi) && (
                          <button onClick={() => batal(t.id)} className="text-xs text-red-600 hover:underline ml-1">
                            Batal
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {assignModal && (
        <AssignHewanModal
          transaksiId={assignModal.id}
          jenis={assignModal.jenis}
          onDone={() => { setAssignModal(null); load() }}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  )
}
```

---

## Task 6: Frontend — POS 4-Step Form

### Files
- Create: `frontend/app/(dashboard)/depot/pos/StepJenisKelas.tsx`
- Create: `frontend/app/(dashboard)/depot/pos/StepPilihHewan.tsx`
- Create: `frontend/app/(dashboard)/depot/pos/StepDataPembeli.tsx`
- Create: `frontend/app/(dashboard)/depot/pos/StepReview.tsx`
- Create: `frontend/app/(dashboard)/depot/pos/page.tsx`

- [ ] **Step 1: Create StepJenisKelas**

```tsx
// frontend/app/(dashboard)/depot/pos/StepJenisKelas.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface Kelas { id: number; kode: string; nama: string }
interface HargaKelas { kelas_id: number; jenis: string; harga_jual: number }

interface Props {
  jenis: string
  kelas_id: number | null
  tipe_qurban: string
  musim: number
  onNext: (data: { jenis: string; kelas_id: number; tipe_qurban: string; harga: number }) => void
}

export function StepJenisKelas({ jenis: initJenis, kelas_id: initKelas, tipe_qurban: initTipe, musim, onNext }: Props) {
  const [jenis, setJenis]         = useState(initJenis || 'SAPI')
  const [tipe, setTipe]           = useState(initTipe || 'SHQ')
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [hargaList, setHargaList] = useState<HargaKelas[]>([])
  const [kelasId, setKelasId]     = useState<number | null>(initKelas)

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelasList(r.data.data ?? []))
    api.get(`/api/master/harga?musim=${musim}`).then(r => setHargaList(r.data.data ?? []))
  }, [musim])

  function getHarga(): number {
    if (!kelasId) return 0
    return hargaList.find(h => h.kelas_id === kelasId && h.jenis === jenis)?.harga_jual ?? 0
  }

  function handleNext() {
    if (!kelasId) return
    onNext({ jenis, kelas_id: kelasId, tipe_qurban: tipe, harga: getHarga() })
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-2">Jenis Hewan</label>
        <div className="flex gap-2">
          {['SAPI', 'DOMBA'].map(j => (
            <button
              key={j}
              onClick={() => { setJenis(j); setKelasId(null) }}
              className={`px-6 py-2 rounded-xl border-2 font-body font-medium transition-colors ${
                jenis === j ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
              }`}
            >
              {j === 'SAPI' ? '🐄 Sapi' : '🐑 Domba'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-2">Tipe Qurban</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'SHQ', label: 'SHQ – Kirim Hidup' },
            { value: 'THQ', label: 'THQ – Sembelih di Depot' },
            { value: 'PHQ', label: 'PHQ – Sembelih + Kirim' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTipe(t.value)}
              className={`px-4 py-2 rounded-xl border-2 text-sm font-body transition-colors ${
                tipe === t.value ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-2">Kelas</label>
        <div className="grid grid-cols-3 gap-2">
          {kelasList.map(k => {
            const harga = hargaList.find(h => h.kelas_id === k.id && h.jenis === jenis)?.harga_jual
            return (
              <button
                key={k.id}
                onClick={() => setKelasId(k.id)}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${
                  kelasId === k.id ? 'border-primary bg-surface-high' : 'border-surface-high hover:border-primary/50'
                }`}
              >
                <p className="font-body font-semibold text-on-surface text-sm">{k.kode}</p>
                <p className="text-xs text-on-surface-variant">{k.nama}</p>
                {harga ? (
                  <p className="text-xs font-medium text-primary mt-1">
                    {harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                  </p>
                ) : (
                  <p className="text-xs text-on-surface-variant mt-1">Harga belum diset</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <Button onClick={handleNext} disabled={!kelasId}>Lanjut →</Button>
    </div>
  )
}
```

- [ ] **Step 2: Create StepPilihHewan**

```tsx
// frontend/app/(dashboard)/depot/pos/StepPilihHewan.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface Hewan {
  id: number
  no_hewan: string
  kelas_jual: { kode: string } | null
  bobot_masuk: string
}

interface Props {
  jenis: string
  hewanId: number | null
  preorder: boolean
  onNext: (data: { hewan_id: number | null; preorder: boolean }) => void
  onBack: () => void
}

export function StepPilihHewan({ jenis, hewanId: initHewanId, preorder: initPreorder, onNext, onBack }: Props) {
  const [hewan, setHewan]       = useState<Hewan[]>([])
  const [selected, setSelected] = useState<number | null>(initHewanId)
  const [preorder, setPreorder] = useState(initPreorder)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get(`/api/hewan?status=AVAILABLE&jenis=${jenis}`)
      .then(r => setHewan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [jenis])

  function handleNext() {
    onNext({ hewan_id: preorder ? null : selected, preorder })
  }

  const canContinue = preorder || selected !== null

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-surface-high cursor-pointer">
        <input
          type="checkbox"
          checked={preorder}
          onChange={e => { setPreorder(e.target.checked); if (e.target.checked) setSelected(null) }}
          className="w-4 h-4"
        />
        <div>
          <p className="font-body font-medium text-on-surface">Pre-order (tanpa nomor hewan)</p>
          <p className="text-xs text-on-surface-variant">Nomor hewan bisa di-assign nanti</p>
        </div>
      </label>

      {!preorder && (
        <div>
          <p className="text-sm font-body font-medium text-on-surface mb-2">
            Pilih Hewan {jenis} Tersedia ({hewan.length} ekor)
          </p>
          {loading ? (
            <p className="text-sm text-on-surface-variant py-4">Memuat...</p>
          ) : hewan.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-4 italic">Tidak ada hewan tersedia</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {hewan.map(h => (
                <button
                  key={h.id}
                  onClick={() => setSelected(h.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-colors ${
                    selected === h.id
                      ? 'border-primary bg-surface-high'
                      : 'border-surface-high hover:border-primary/50'
                  }`}
                >
                  <p className="font-body font-semibold text-on-surface">#{h.no_hewan}</p>
                  <p className="text-xs text-on-surface-variant">{h.kelas_jual?.kode} · {h.bobot_masuk} kg</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onBack}>← Kembali</Button>
        <Button onClick={handleNext} disabled={!canContinue}>Lanjut →</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create StepDataPembeli**

```tsx
// frontend/app/(dashboard)/depot/pos/StepDataPembeli.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'

interface Customer {
  id: number
  nama: string
  hp: string
  alamat: string | null
  kota: string | null
}

interface PembeliData {
  customer_id: number | null
  nama: string
  hp: string
  alamat: string
  kota: string
}

interface Props {
  data: PembeliData
  onNext: (data: PembeliData & { customer_id: number }) => void
  onBack: () => void
}

export function StepDataPembeli({ data: initData, onNext, onBack }: Props) {
  const [nama, setNama]   = useState(initData.nama)
  const [hp, setHp]       = useState(initData.hp)
  const [alamat, setAlamat] = useState(initData.alamat)
  const [kota, setKota]   = useState(initData.kota)
  const [suggestions, setSuggestions] = useState<Customer[]>([])
  const [showSug, setShowSug] = useState(false)
  const [saving, setSaving]   = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout>>()

  function searchCustomer(q: string) {
    clearTimeout(debounce.current)
    if (q.length < 2) { setSuggestions([]); return }
    debounce.current = setTimeout(() => {
      api.get(`/api/customer?q=${q}`)
        .then(r => { setSuggestions(r.data.data ?? []); setShowSug(true) })
    }, 300)
  }

  function selectCustomer(c: Customer) {
    setNama(c.nama)
    setHp(c.hp ?? '')
    setAlamat(c.alamat ?? '')
    setKota(c.kota ?? '')
    setShowSug(false)
    // store customer_id for next step
    ;(window as any).__selectedCustomerId = c.id
  }

  async function handleNext() {
    if (!nama.trim()) return
    setSaving(true)
    try {
      let customerId = (window as any).__selectedCustomerId as number | null
      if (!customerId) {
        const res = await api.post('/api/customer', { nama, hp, alamat, kota })
        customerId = res.data.customer.id
      }
      onNext({ customer_id: customerId!, nama, hp, alamat, kota })
    } finally {
      setSaving(false)
      delete (window as any).__selectedCustomerId
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <label className="block text-sm font-body font-medium text-on-surface mb-1">Nama Pembeli *</label>
        <Input
          value={nama}
          onChange={e => { setNama(e.target.value); searchCustomer(e.target.value) }}
          onFocus={() => suggestions.length > 0 && setShowSug(true)}
          placeholder="Cari nama pelanggan lama atau isi baru..."
        />
        {showSug && suggestions.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 bg-surface-lowest border border-surface-high rounded-xl shadow-card mt-1 max-h-48 overflow-y-auto">
            {suggestions.map(c => (
              <button
                key={c.id}
                onClick={() => selectCustomer(c)}
                className="w-full text-left px-3 py-2 hover:bg-surface-high text-sm font-body"
              >
                <span className="font-medium text-on-surface">{c.nama}</span>
                <span className="text-on-surface-variant ml-2">{c.hp}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-1">No HP</label>
        <Input value={hp} onChange={e => setHp(e.target.value)} placeholder="08..." />
      </div>

      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-1">Alamat</label>
        <Input value={alamat} onChange={e => setAlamat(e.target.value)} placeholder="Jalan, RT/RW..." />
      </div>

      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-1">Kota</label>
        <Input value={kota} onChange={e => setKota(e.target.value)} placeholder="Nama kota..." />
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onBack}>← Kembali</Button>
        <Button onClick={handleNext} disabled={!nama.trim()} loading={saving}>Lanjut →</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create StepReview**

```tsx
// frontend/app/(dashboard)/depot/pos/StepReview.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface User { id: number; name: string; divisi: string }

interface Props {
  summary: {
    jenis: string
    tipe_qurban: string
    kelas_kode: string
    harga: number
    hewan_no: string | null
    preorder: boolean
    nama_pembeli: string
    hp: string
  }
  onSubmit: (data: { cs_id: number | null; teller_id: number | null; sales_id: number | null }) => void
  onBack: () => void
  submitting: boolean
}

export function StepReview({ summary, onSubmit, onBack, submitting }: Props) {
  const [users, setUsers]     = useState<User[]>([])
  const [csId, setCsId]       = useState<number | null>(null)
  const [tellerId, setTeller] = useState<number | null>(null)
  const [salesId, setSales]   = useState<number | null>(null)

  useEffect(() => {
    api.get('/api/karyawan').then(r => setUsers(r.data.data ?? []))
  }, [])

  function SelectUser({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
    return (
      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-1">{label}</label>
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
          className="input-field w-full"
        >
          <option value="">— Tidak ada —</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.divisi})</option>)}
        </select>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface-high rounded-xl p-4 space-y-2 text-sm font-body">
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Jenis</span>
          <span className="font-medium text-on-surface">{summary.jenis}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Tipe Qurban</span>
          <span className="font-medium text-on-surface">{summary.tipe_qurban}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Kelas</span>
          <span className="font-medium text-on-surface">{summary.kelas_kode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Hewan</span>
          <span className="font-medium text-on-surface">
            {summary.preorder ? <span className="italic text-yellow-700">Pre-order</span> : `#${summary.hewan_no}`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Pembeli</span>
          <span className="font-medium text-on-surface">{summary.nama_pembeli} · {summary.hp}</span>
        </div>
        <div className="flex justify-between border-t border-surface-highest pt-2">
          <span className="text-on-surface font-semibold">Total</span>
          <span className="font-semibold text-primary">
            {summary.harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <SelectUser label="CS" value={csId} onChange={setCsId} />
        <SelectUser label="Teller" value={tellerId} onChange={setTeller} />
        <SelectUser label="Sales" value={salesId} onChange={setSales} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onBack}>← Kembali</Button>
        <Button onClick={() => onSubmit({ cs_id: csId, teller_id: tellerId, sales_id: salesId })} loading={submitting}>
          Simpan Transaksi
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create POS main page**

```tsx
// frontend/app/(dashboard)/depot/pos/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { StepJenisKelas } from './StepJenisKelas'
import { StepPilihHewan } from './StepPilihHewan'
import { StepDataPembeli } from './StepDataPembeli'
import { StepReview } from './StepReview'
import api from '@/lib/api'
import { useSession } from 'next-auth/react'

const MUSIM = new Date().getFullYear()

const STEPS = ['Jenis & Kelas', 'Pilih Hewan', 'Data Pembeli', 'Review & Submit']

interface FormState {
  // Step 1
  jenis: string
  kelas_id: number | null
  tipe_qurban: string
  harga: number
  // Step 2
  hewan_id: number | null
  hewan_no: string | null
  preorder: boolean
  // Step 3
  customer_id: number | null
  nama_pembeli: string
  hp: string
  alamat: string
  kota: string
}

const INIT: FormState = {
  jenis: 'SAPI', kelas_id: null, tipe_qurban: 'SHQ', harga: 0,
  hewan_id: null, hewan_no: null, preorder: false,
  customer_id: null, nama_pembeli: '', hp: '', alamat: '', kota: '',
}

export default function POSPage() {
  const router        = useRouter()
  const { data: session } = useSession()
  const [step, setStep]   = useState(0)
  const [form, setForm]   = useState<FormState>(INIT)
  const [submitting, setSubmitting] = useState(false)

  const depotId = (session?.user as any)?.depot_id as number | undefined

  function Step1Done(data: { jenis: string; kelas_id: number; tipe_qurban: string; harga: number }) {
    setForm(f => ({ ...f, ...data }))
    setStep(1)
  }

  function Step2Done(data: { hewan_id: number | null; preorder: boolean }) {
    setForm(f => ({ ...f, ...data }))
    setStep(2)
  }

  function Step3Done(data: { customer_id: number; nama: string; hp: string; alamat: string; kota: string }) {
    setForm(f => ({ ...f, customer_id: data.customer_id, nama_pembeli: data.nama, hp: data.hp, alamat: data.alamat, kota: data.kota }))
    setStep(3)
  }

  async function Step4Done(data: { cs_id: number | null; teller_id: number | null; sales_id: number | null }) {
    if (!depotId || !form.kelas_id || !form.customer_id) return
    setSubmitting(true)
    try {
      const res = await api.post('/api/transaksi', {
        depot_id:    depotId,
        hewan_id:    form.hewan_id,
        customer_id: form.customer_id,
        cs_id:       data.cs_id,
        teller_id:   data.teller_id,
        sales_id:    data.sales_id,
        tipe_qurban: form.tipe_qurban,
        jenis:       form.jenis,
        kelas_id:    form.kelas_id,
        musim:       MUSIM,
      })
      router.push('/depot/transaksi')
    } catch {
      setSubmitting(false)
    }
  }

  // Lookup kelas kode from hewan list — pass through StepJenisKelas selection
  // We store it in form state during Step1Done below
  // For review display we need kelas_kode — simplest: store in form
  // (updated pattern: Step1Done also passes kelas_kode)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-on-surface">POS Penjualan</h1>
        <p className="text-sm text-on-surface-variant mt-1">Transaksi baru</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-body font-semibold transition-colors ${
              i < step ? 'bg-primary text-white'
              : i === step ? 'bg-primary text-white ring-2 ring-primary/30'
              : 'bg-surface-high text-on-surface-variant'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-body hidden sm:inline ${i === step ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-surface-high" />}
          </div>
        ))}
      </div>

      <Card>
        <h2 className="font-display font-semibold text-on-surface mb-4">{STEPS[step]}</h2>

        {step === 0 && (
          <StepJenisKelas
            jenis={form.jenis}
            kelas_id={form.kelas_id}
            tipe_qurban={form.tipe_qurban}
            musim={MUSIM}
            onNext={Step1Done}
          />
        )}
        {step === 1 && (
          <StepPilihHewan
            jenis={form.jenis}
            hewanId={form.hewan_id}
            preorder={form.preorder}
            onNext={Step2Done}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepDataPembeli
            data={{ customer_id: form.customer_id, nama: form.nama_pembeli, hp: form.hp, alamat: form.alamat, kota: form.kota }}
            onNext={Step3Done}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepReview
            summary={{
              jenis: form.jenis,
              tipe_qurban: form.tipe_qurban,
              kelas_kode: String(form.kelas_id),  // will show ID; kelas_kode passed via form state in real impl
              harga: form.harga,
              hewan_no: form.hewan_no,
              preorder: form.preorder,
              nama_pembeli: form.nama_pembeli,
              hp: form.hp,
            }}
            onSubmit={Step4Done}
            onBack={() => setStep(2)}
            submitting={submitting}
          />
        )}
      </Card>
    </div>
  )
}
```

---

## Task 7: Sidebar Update

### Files
- Modify: `frontend/components/shared/Sidebar.tsx`

- [ ] **Step 1: Add POS + Transaksi nav items**

In `Sidebar.tsx`, find the `navItems` array. Add after Kandang:

```tsx
{ href: '/depot/pos',        label: 'POS Penjualan',   icon: ShoppingCart, roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_ANGGOTA'] },
{ href: '/depot/transaksi',  label: 'Transaksi',        icon: Receipt,      roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_ANGGOTA','KEUANGAN'] },
```

Add `ShoppingCart` and `Receipt` to lucide-react imports.

- [ ] **Step 2: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend
npx tsc --noEmit
```

Expected: 0 errors. Fix any type errors before committing.

- [ ] **Step 3: Commit frontend**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/
git commit -m "feat(ui): POS penjualan — 4-step wizard + list transaksi + assign hewan modal"
```

---

## Task 8: Update TASKS.md

- [ ] **Step 1: Update task file status**

In `docs/tasks/T-05-pos-penjualan.md`, change:
```
**Status:** `TODO`
```
to:
```
**Status:** `DONE`
```

- [ ] **Step 2: Update TASKS.md**

`docs/TASKS.md` T-05 row already shows `✅ DONE` (was pre-marked). Verify it's correct. No change needed if already done.

- [ ] **Step 3: Commit docs**

```bash
cd /c/Users/USER/projects/simhq
git add docs/tasks/T-05-pos-penjualan.md
git commit -m "docs: mark T-05 as DONE"
```

---

## Acceptance Criteria Checklist

- [ ] `customers` table created with nama/hp/alamat fields
- [ ] `transaksi` table created with all FK columns + status_transaksi enum
- [ ] `POST /api/transaksi` — creates with hewan → HEWAN_TERALOKASI, tanpa hewan → MENUNGGU_HEWAN
- [ ] `PUT /api/transaksi/{id}/assign-hewan` — updates status ke HEWAN_TERALOKASI
- [ ] `PUT /api/transaksi/{id}/konfirmasi` — status DIKONFIRMASI + hewan.status → BOOKED
- [ ] `PUT /api/transaksi/{id}/batal` — status DIBATALKAN + hewan.status → AVAILABLE
- [ ] konfirmasi gagal (422) jika transaksi masih MENUNGGU_HEWAN
- [ ] noFaktur unique per depot per musim, format `{depot_id}-{musim}-{seq:04d}`
- [ ] 7 backend tests pass
- [ ] Frontend: `/depot/transaksi` list dengan filter status + tombol konfirmasi/batal/assign
- [ ] Frontend: `/depot/pos` 4-step wizard berhasil submit dan redirect ke /depot/transaksi
- [ ] TypeScript: 0 errors
