# T-03 Pengadaan Hewan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Modul pengadaan hewan — registrasi hewan (no 3-digit auto-increment per depot/musim), supplier, riwayat perpindahan petak, QR code per hewan, cetak label PDF batch, statistik pengadaan.

**Architecture:** Laravel 11 backend (4 models: Hewan, Supplier, StatusHewan enum, RiwayatPerpindahan). no_hewan auto-increment via DB transaction + SELECT MAX. QR code via `simplesoftwareio/simple-qrcode` (SVG inline). PDF labels via `barryvdh/laravel-dompdf`. petak_id nullable (no FK yet — FK ditambah di T-04 saat petak_kandang table dibuat). Frontend: halaman list hewan + form tambah + detail + stats.

**Tech Stack:** Laravel 11, PostgreSQL, simplesoftwareio/simple-qrcode, barryvdh/laravel-dompdf, Next.js 14, Tailwind

---

## File Map

### Backend — Created
```
backend/
  app/Enums/StatusHewan.php
  app/Models/Hewan.php
  app/Models/Supplier.php
  app/Models/RiwayatPerpindahan.php
  app/Http/Controllers/HewanController.php
  app/Http/Controllers/SupplierController.php
  app/Http/Requests/StoreHewanRequest.php
  app/Http/Requests/UpdateHewanRequest.php
  app/Http/Requests/TransferHewanRequest.php
  app/Services/HewanService.php         ← no_hewan generation + QR
  database/migrations/*_create_supplier_table.php
  database/migrations/*_create_hewan_table.php
  database/migrations/*_create_riwayat_perpindahan_table.php
  database/seeders/SupplierSeeder.php
  tests/Feature/Hewan/HewanRegistrasiTest.php
  tests/Feature/Hewan/HewanTransferTest.php
  tests/Feature/Hewan/StatistikTest.php
```

### Backend — Modified
```
  routes/api.php
  database/seeders/DatabaseSeeder.php
```

### Frontend — Created
```
frontend/
  app/(dashboard)/depot/pengadaan/page.tsx      ← list + filter
  app/(dashboard)/depot/pengadaan/TambahHewanModal.tsx
  app/(dashboard)/depot/pengadaan/[id]/page.tsx  ← detail hewan
  app/(dashboard)/depot/pengadaan/StatistikPanel.tsx
```

### Frontend — Modified
```
  components/shared/Sidebar.tsx  ← add Pengadaan link
```

---

## Task 1: Install Packages + Migrations

- [ ] **Step 1: Install QR + PDF packages**

```bash
cd /c/Users/USER/projects/simhq/backend
composer require simplesoftwareio/simple-qrcode
composer require barryvdh/laravel-dompdf
```

- [ ] **Step 2: Create migrations**

```bash
php artisan make:migration create_supplier_table
php artisan make:migration create_hewan_table
php artisan make:migration create_riwayat_perpindahan_table
```

- [ ] **Step 3: supplier migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('supplier', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 255);
            $table->string('kontak', 100)->nullable();
            $table->text('alamat')->nullable();
            $table->boolean('is_gum')->default(false); // GUM = supplier konsinyasi utama
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('supplier'); }
};
```

- [ ] **Step 4: hewan migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('hewan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('supplier')->nullOnDelete();
            $table->foreignId('kelas_asal_id')->constrained('kelas_hewan')->restrictOnDelete();
            $table->foreignId('kelas_jual_id')->constrained('kelas_hewan')->restrictOnDelete();
            $table->string('no_hewan', 3);        // 001–999
            $table->enum('jenis', ['SAPI', 'DOMBA']);
            $table->decimal('bobot_masuk', 6, 2); // kg
            $table->decimal('bobot_terkini', 6, 2)->nullable();
            $table->date('tgl_masuk');
            $table->year('musim');
            $table->enum('status', ['AVAILABLE', 'BOOKED', 'SOLD', 'DELIVERED', 'MATI'])->default('AVAILABLE');
            $table->unsignedBigInteger('petak_id')->nullable(); // FK ditambah T-04
            $table->timestamps();

            $table->unique(['depot_id', 'musim', 'no_hewan'], 'hewan_no_unique');
        });
    }
    public function down(): void { Schema::dropIfExists('hewan'); }
};
```

- [ ] **Step 5: riwayat_perpindahan migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('riwayat_perpindahan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hewan_id')->constrained('hewan')->cascadeOnDelete();
            $table->unsignedBigInteger('dari_petak_id')->nullable();
            $table->unsignedBigInteger('ke_petak_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('tgl');
            $table->text('catatan')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('riwayat_perpindahan'); }
};
```

- [ ] **Step 6: Run migrations**

```bash
php artisan migrate
```

- [ ] **Step 7: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/
git commit -m "feat(db): add supplier, hewan, riwayat_perpindahan tables + install QR+PDF packages"
```

---

## Task 2: Enums + Models + Supplier Seeder

- [ ] **Step 1: Create StatusHewan enum**

```php
<?php
// backend/app/Enums/StatusHewan.php
namespace App\Enums;

enum StatusHewan: string
{
    case AVAILABLE  = 'AVAILABLE';
    case BOOKED     = 'BOOKED';
    case SOLD       = 'SOLD';
    case DELIVERED  = 'DELIVERED';
    case MATI       = 'MATI';
}
```

- [ ] **Step 2: Create Supplier model**

```php
<?php
// backend/app/Models/Supplier.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $table = 'supplier';
    protected $fillable = ['nama', 'kontak', 'alamat', 'is_gum', 'is_active'];
    protected $casts = ['is_gum' => 'boolean', 'is_active' => 'boolean'];

    public function hewan(): HasMany
    {
        return $this->hasMany(Hewan::class);
    }
}
```

- [ ] **Step 3: Create Hewan model**

```php
<?php
// backend/app/Models/Hewan.php
namespace App\Models;

use App\Enums\StatusHewan;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Hewan extends Model
{
    protected $table = 'hewan';

    protected $fillable = [
        'depot_id', 'supplier_id', 'kelas_asal_id', 'kelas_jual_id',
        'no_hewan', 'jenis', 'bobot_masuk', 'bobot_terkini',
        'tgl_masuk', 'musim', 'status', 'petak_id',
    ];

    protected $casts = [
        'status'        => StatusHewan::class,
        'tgl_masuk'     => 'date',
        'bobot_masuk'   => 'decimal:2',
        'bobot_terkini' => 'decimal:2',
        'musim'         => 'integer',
    ];

    public function depot(): BelongsTo    { return $this->belongsTo(Depot::class); }
    public function supplier(): BelongsTo { return $this->belongsTo(Supplier::class); }
    public function kelasAsal(): BelongsTo { return $this->belongsTo(KelasHewan::class, 'kelas_asal_id'); }
    public function kelasJual(): BelongsTo { return $this->belongsTo(KelasHewan::class, 'kelas_jual_id'); }
    public function riwayatPerpindahan(): HasMany { return $this->hasMany(RiwayatPerpindahan::class); }

    public function qrString(): string
    {
        return "{$this->depot_id}-{$this->musim}-{$this->no_hewan}";
    }
}
```

- [ ] **Step 4: Create RiwayatPerpindahan model**

```php
<?php
// backend/app/Models/RiwayatPerpindahan.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiwayatPerpindahan extends Model
{
    protected $table = 'riwayat_perpindahan';

    protected $fillable = [
        'hewan_id', 'dari_petak_id', 'ke_petak_id',
        'user_id', 'tgl', 'catatan',
    ];

    protected $casts = ['tgl' => 'date'];

    public function hewan(): BelongsTo { return $this->belongsTo(Hewan::class); }
    public function user(): BelongsTo  { return $this->belongsTo(User::class); }
}
```

- [ ] **Step 5: Create SupplierSeeder**

```php
<?php
// backend/database/seeders/SupplierSeeder.php
namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        Supplier::firstOrCreate(
            ['nama' => 'GUM'],
            [
                'kontak'    => '',
                'alamat'    => 'Supplier Utama GUM',
                'is_gum'    => true,
                'is_active' => true,
            ]
        );
    }
}
```

Add to `DatabaseSeeder::run()`:
```php
$this->call(SupplierSeeder::class);
```

Run seeder:
```bash
cd /c/Users/USER/projects/simhq/backend
php artisan db:seed --class=SupplierSeeder
```

- [ ] **Step 6: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/ backend/database/seeders/
git commit -m "feat(pengadaan): StatusHewan enum + Hewan/Supplier/RiwayatPerpindahan models + GUM seeder"
```

---

## Task 3: HewanService (no_hewan generation + QR)

- [ ] **Step 1: Create HewanService**

```php
<?php
// backend/app/Services/HewanService.php
namespace App\Services;

use App\Models\Hewan;
use Illuminate\Support\Facades\DB;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class HewanService
{
    /**
     * Generate next no_hewan (001-999) for depot+musim, thread-safe via DB lock.
     */
    public function generateNoHewan(int $depotId, int $musim): string
    {
        return DB::transaction(function () use ($depotId, $musim) {
            $last = Hewan::where('depot_id', $depotId)
                ->where('musim', $musim)
                ->lockForUpdate()
                ->max('no_hewan');

            $next = $last ? ((int) $last) + 1 : 1;

            if ($next > 999) {
                throw new \RuntimeException('Nomor hewan depot ini sudah mencapai maksimum 999.');
            }

            return str_pad($next, 3, '0', STR_PAD_LEFT);
        });
    }

    /**
     * Generate QR code as SVG string for inline display.
     * Encodes: "{depotId}-{musim}-{noHewan}"
     */
    public function generateQrSvg(string $qrString): string
    {
        return QrCode::format('svg')
            ->size(150)
            ->errorCorrection('M')
            ->generate($qrString);
    }

    /**
     * Generate QR code as PNG base64 for PDF labels.
     */
    public function generateQrPngBase64(string $qrString): string
    {
        $png = QrCode::format('png')
            ->size(200)
            ->errorCorrection('M')
            ->generate($qrString);

        return base64_encode($png);
    }
}
```

- [ ] **Step 2: Register service in AppServiceProvider (optional — can inject via constructor)**

The service will be injected via constructor in the controller. No extra registration needed.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Services/
git commit -m "feat(pengadaan): HewanService — no_hewan auto-increment + QR code generation"
```

---

## Task 4: API Controllers + Routes + Tests

- [ ] **Step 1: Write failing tests**

```php
<?php
// backend/tests/Feature/Hewan/HewanRegistrasiTest.php
namespace Tests\Feature\Hewan;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\KelasHewan;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HewanRegistrasiTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;
    private KelasHewan $kelasA;
    private Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->depot      = Depot::factory()->create();
        $this->kelasA     = KelasHewan::create(['kode' => 'A', 'nama' => 'A', 'urutan' => 4]);
        $this->supplier   = Supplier::create(['nama' => 'GUM', 'is_gum' => true, 'is_active' => true]);
    }

    public function test_registrasi_hewan_baru_generates_no_hewan(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->postJson('/api/hewan', [
                'depot_id'     => $this->depot->id,
                'supplier_id'  => $this->supplier->id,
                'kelas_asal_id'=> $this->kelasA->id,
                'kelas_jual_id'=> $this->kelasA->id,
                'jenis'        => 'SAPI',
                'bobot_masuk'  => 250.5,
                'tgl_masuk'    => '2026-05-01',
                'musim'        => 2026,
            ]);

        $response->assertCreated()
            ->assertJsonPath('hewan.no_hewan', '001')
            ->assertJsonPath('hewan.status', 'AVAILABLE');
    }

    public function test_no_hewan_auto_increment(): void
    {
        $payload = [
            'depot_id'     => $this->depot->id,
            'supplier_id'  => $this->supplier->id,
            'kelas_asal_id'=> $this->kelasA->id,
            'kelas_jual_id'=> $this->kelasA->id,
            'jenis'        => 'SAPI',
            'bobot_masuk'  => 200,
            'tgl_masuk'    => '2026-05-01',
            'musim'        => 2026,
        ];

        $this->actingAs($this->superAdmin)->postJson('/api/hewan', $payload);
        $r2 = $this->actingAs($this->superAdmin)->postJson('/api/hewan', $payload);

        $r2->assertJsonPath('hewan.no_hewan', '002');
    }

    public function test_list_hewan_with_status_filter(): void
    {
        $this->actingAs($this->superAdmin)->postJson('/api/hewan', [
            'depot_id'     => $this->depot->id,
            'supplier_id'  => $this->supplier->id,
            'kelas_asal_id'=> $this->kelasA->id,
            'kelas_jual_id'=> $this->kelasA->id,
            'jenis'        => 'DOMBA',
            'bobot_masuk'  => 30,
            'tgl_masuk'    => '2026-05-01',
            'musim'        => 2026,
        ]);

        $this->actingAs($this->superAdmin)
            ->getJson("/api/hewan?depot={$this->depot->id}&status=AVAILABLE")
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'no_hewan', 'jenis', 'status']]]);
    }

    public function test_get_hewan_detail_with_qr(): void
    {
        $r = $this->actingAs($this->superAdmin)->postJson('/api/hewan', [
            'depot_id'     => $this->depot->id,
            'supplier_id'  => $this->supplier->id,
            'kelas_asal_id'=> $this->kelasA->id,
            'kelas_jual_id'=> $this->kelasA->id,
            'jenis'        => 'SAPI',
            'bobot_masuk'  => 300,
            'tgl_masuk'    => '2026-05-01',
            'musim'        => 2026,
        ]);

        $id = $r->json('hewan.id');

        $this->actingAs($this->superAdmin)
            ->getJson("/api/hewan/{$id}")
            ->assertOk()
            ->assertJsonStructure(['hewan' => ['id', 'no_hewan', 'qr_svg']]);
    }

    public function test_statistik_pengadaan(): void
    {
        $this->actingAs($this->superAdmin)
            ->getJson("/api/hewan/statistik?depot={$this->depot->id}&musim=2026")
            ->assertOk()
            ->assertJsonStructure(['total', 'per_jenis', 'per_status']);
    }
}
```

```php
<?php
// backend/tests/Feature/Hewan/HewanTransferTest.php
namespace Tests\Feature\Hewan;

use App\Models\Depot;
use App\Models\Hewan;
use App\Models\KelasHewan;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HewanTransferTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Hewan $hewan;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $depot    = Depot::factory()->create();
        $kelas    = KelasHewan::create(['kode' => 'B', 'nama' => 'Bagus', 'urutan' => 3]);
        $supplier = Supplier::create(['nama' => 'GUM', 'is_gum' => true, 'is_active' => true]);

        $this->hewan = Hewan::create([
            'depot_id'     => $depot->id,
            'supplier_id'  => $supplier->id,
            'kelas_asal_id'=> $kelas->id,
            'kelas_jual_id'=> $kelas->id,
            'no_hewan'     => '001',
            'jenis'        => 'SAPI',
            'bobot_masuk'  => 300,
            'tgl_masuk'    => '2026-05-01',
            'musim'        => 2026,
            'status'       => 'AVAILABLE',
            'petak_id'     => 1,
        ]);
    }

    public function test_transfer_petak_creates_riwayat(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson("/api/hewan/{$this->hewan->id}/transfer", [
                'ke_petak_id' => 2,
                'catatan'     => 'Pindah ke kandang besar',
            ])
            ->assertOk()
            ->assertJsonStructure(['hewan', 'riwayat']);

        $this->assertDatabaseHas('riwayat_perpindahan', [
            'hewan_id'    => $this->hewan->id,
            'dari_petak_id' => 1,
            'ke_petak_id'   => 2,
        ]);
    }

    public function test_update_kelas_jual(): void
    {
        $kelasIST = KelasHewan::create(['kode' => 'IST', 'nama' => 'Istimewa', 'urutan' => 8]);

        $this->actingAs($this->superAdmin)
            ->putJson("/api/hewan/{$this->hewan->id}", ['kelas_jual_id' => $kelasIST->id])
            ->assertOk()
            ->assertJsonPath('hewan.kelas_jual_id', $kelasIST->id);
    }
}
```

- [ ] **Step 2: Run tests — confirm FAIL**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan test tests/Feature/Hewan/
```

Expected: FAIL — controllers not found.

- [ ] **Step 3: Create StoreHewanRequest**

```php
<?php
// backend/app/Http/Requests/StoreHewanRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHewanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id'      => ['required', 'exists:depots,id'],
            'supplier_id'   => ['nullable', 'exists:supplier,id'],
            'kelas_asal_id' => ['required', 'exists:kelas_hewan,id'],
            'kelas_jual_id' => ['required', 'exists:kelas_hewan,id'],
            'jenis'         => ['required', 'in:SAPI,DOMBA'],
            'bobot_masuk'   => ['required', 'numeric', 'min:0'],
            'tgl_masuk'     => ['required', 'date'],
            'musim'         => ['required', 'integer', 'min:2020', 'max:2100'],
            'petak_id'      => ['nullable', 'integer'],
        ];
    }
}
```

- [ ] **Step 4: Create UpdateHewanRequest**

```php
<?php
// backend/app/Http/Requests/UpdateHewanRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHewanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'kelas_jual_id' => ['sometimes', 'exists:kelas_hewan,id'],
            'bobot_terkini' => ['sometimes', 'numeric', 'min:0'],
            'status'        => ['sometimes', 'in:AVAILABLE,BOOKED,SOLD,DELIVERED,MATI'],
            'petak_id'      => ['sometimes', 'nullable', 'integer'],
        ];
    }
}
```

- [ ] **Step 5: Create TransferHewanRequest**

```php
<?php
// backend/app/Http/Requests/TransferHewanRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TransferHewanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'ke_petak_id' => ['required', 'integer'],
            'catatan'     => ['nullable', 'string', 'max:500'],
        ];
    }
}
```

- [ ] **Step 6: Create HewanController**

```php
<?php
// backend/app/Http/Controllers/HewanController.php
namespace App\Http\Controllers;

use App\Http\Requests\StoreHewanRequest;
use App\Http\Requests\TransferHewanRequest;
use App\Http\Requests\UpdateHewanRequest;
use App\Models\Hewan;
use App\Models\RiwayatPerpindahan;
use App\Services\HewanService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class HewanController extends Controller
{
    public function __construct(private HewanService $hewanService) {}

    public function index(Request $request): JsonResponse
    {
        $hewan = Hewan::with(['kelasAsal:id,kode', 'kelasJual:id,kode', 'supplier:id,nama'])
            ->when($request->depot,  fn($q) => $q->where('depot_id', $request->depot))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->jenis,  fn($q) => $q->where('jenis', $request->jenis))
            ->when($request->kelas,  fn($q) => $q->where('kelas_jual_id', $request->kelas))
            ->when($request->musim,  fn($q) => $q->where('musim', $request->musim))
            ->orderBy('no_hewan')
            ->paginate(50);

        return response()->json($hewan);
    }

    public function store(StoreHewanRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['no_hewan'] = $this->hewanService->generateNoHewan(
            $data['depot_id'],
            $data['musim']
        );

        $hewan = Hewan::create($data);

        return response()->json(['hewan' => $hewan->load(['kelasAsal', 'kelasJual', 'supplier'])], 201);
    }

    public function show(Hewan $hewan): JsonResponse
    {
        $hewan->load(['kelasAsal', 'kelasJual', 'supplier', 'riwayatPerpindahan.user:id,name']);

        return response()->json([
            'hewan'  => array_merge($hewan->toArray(), [
                'qr_svg' => $this->hewanService->generateQrSvg($hewan->qrString()),
            ]),
        ]);
    }

    public function update(UpdateHewanRequest $request, Hewan $hewan): JsonResponse
    {
        $hewan->update($request->validated());

        return response()->json(['hewan' => $hewan->fresh()->load(['kelasAsal', 'kelasJual'])]);
    }

    public function transfer(TransferHewanRequest $request, Hewan $hewan): JsonResponse
    {
        $dariPetakId = $hewan->petak_id;

        $hewan->update(['petak_id' => $request->ke_petak_id]);

        $riwayat = RiwayatPerpindahan::create([
            'hewan_id'      => $hewan->id,
            'dari_petak_id' => $dariPetakId,
            'ke_petak_id'   => $request->ke_petak_id,
            'user_id'       => $request->user()->id,
            'tgl'           => today(),
            'catatan'       => $request->catatan,
        ]);

        return response()->json([
            'hewan'   => $hewan->fresh(),
            'riwayat' => $riwayat,
        ]);
    }

    public function statistik(Request $request): JsonResponse
    {
        $query = Hewan::query()
            ->when($request->depot, fn($q) => $q->where('depot_id', $request->depot))
            ->when($request->musim, fn($q) => $q->where('musim', $request->musim));

        $total     = (clone $query)->count();
        $perJenis  = (clone $query)->selectRaw('jenis, count(*) as total')->groupBy('jenis')->get();
        $perStatus = (clone $query)->selectRaw('status, count(*) as total')->groupBy('status')->get();
        $perKelas  = (clone $query)
            ->join('kelas_hewan', 'hewan.kelas_jual_id', '=', 'kelas_hewan.id')
            ->selectRaw('kelas_hewan.kode, kelas_hewan.urutan, count(*) as total')
            ->groupBy('kelas_hewan.id', 'kelas_hewan.kode', 'kelas_hewan.urutan')
            ->orderBy('kelas_hewan.urutan')
            ->get();

        return response()->json([
            'total'      => $total,
            'per_jenis'  => $perJenis,
            'per_status' => $perStatus,
            'per_kelas'  => $perKelas,
        ]);
    }

    public function cetakLabel(Request $request): Response
    {
        $ids   = explode(',', $request->ids ?? '');
        $hewan = Hewan::with(['kelasJual:id,kode', 'depot:id,nama'])
            ->whereIn('id', $ids)
            ->get()
            ->map(function ($h) {
                return array_merge($h->toArray(), [
                    'qr_b64' => $this->hewanService->generateQrPngBase64($h->qrString()),
                ]);
            });

        $pdf = Pdf::loadView('labels.hewan', ['hewan' => $hewan])
            ->setPaper([0, 0, 141.73, 85.04], 'landscape'); // 5x3 cm in points

        return $pdf->download('label-hewan.pdf');
    }
}
```

- [ ] **Step 7: Create SupplierController**

```php
<?php
// backend/app/Http/Controllers/SupplierController.php
namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Supplier::where('is_active', true)->orderBy('nama')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nama'    => ['required', 'string', 'max:255'],
            'kontak'  => ['nullable', 'string', 'max:100'],
            'alamat'  => ['nullable', 'string'],
            'is_gum'  => ['sometimes', 'boolean'],
        ]);

        return response()->json(['supplier' => Supplier::create($data)], 201);
    }
}
```

- [ ] **Step 8: Create PDF label view**

Create directory and file `backend/resources/views/labels/hewan.blade.php`:

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; }
  .label {
    width: 141.73pt;
    height: 85.04pt;
    border: 1px solid #ccc;
    padding: 6pt;
    display: flex;
    align-items: center;
    gap: 6pt;
    page-break-after: always;
  }
  .qr img { width: 60pt; height: 60pt; }
  .info { flex: 1; }
  .no-hewan { font-size: 20pt; font-weight: bold; line-height: 1; }
  .detail { font-size: 8pt; color: #555; margin-top: 4pt; }
  .depot { font-size: 7pt; color: #888; margin-top: 2pt; }
</style>
</head>
<body>
@foreach($hewan as $h)
<div class="label">
  <div class="qr">
    <img src="data:image/png;base64,{{ $h['qr_b64'] }}" alt="QR">
  </div>
  <div class="info">
    <div class="no-hewan">{{ $h['no_hewan'] }}</div>
    <div class="detail">{{ $h['jenis'] }} · Kelas {{ $h['kelas_jual']['kode'] ?? '—' }}</div>
    <div class="depot">{{ $h['depot']['nama'] ?? '' }} · {{ $h['musim'] }}</div>
  </div>
</div>
@endforeach
</body>
</html>
```

- [ ] **Step 9: Add routes to api.php**

Inside `auth:sanctum` middleware group, add:

```php
// Hewan
Route::get('hewan/statistik',       [HewanController::class, 'statistik']);
Route::get('hewan/cetak-label',     [HewanController::class, 'cetakLabel']);
Route::get('hewan',                 [HewanController::class, 'index']);
Route::get('hewan/{hewan}',         [HewanController::class, 'show']);
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,KANDANG_SAPI_KETUA,KANDANG_DOMBA_KETUA')->group(function () {
    Route::post('hewan',               [HewanController::class, 'store']);
    Route::put('hewan/{hewan}',        [HewanController::class, 'update']);
    Route::post('hewan/{hewan}/transfer', [HewanController::class, 'transfer']);
});

// Supplier
Route::get('supplier',  [SupplierController::class, 'index']);
Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT')->group(function () {
    Route::post('supplier', [SupplierController::class, 'store']);
});
```

Add `use App\Http\Controllers\HewanController;` and `use App\Http\Controllers\SupplierController;` at top of routes/api.php.

- [ ] **Step 10: Run all tests**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan test
```

Expected: 31 tests pass (22 T-01+T-02 + 7 new T-03 + 2 transfer).

- [ ] **Step 11: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/
git commit -m "feat(pengadaan): Hewan+Supplier CRUD, transfer petak, QR code, cetak label PDF, 31 tests"
```

---

## Task 5: Frontend — Pengadaan Pages

- [ ] **Step 1: Create list page `app/(dashboard)/depot/pengadaan/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import { TambahHewanModal } from './TambahHewanModal'
import { StatistikPanel } from './StatistikPanel'
import api from '@/lib/api'
import Link from 'next/link'

interface Hewan {
  id: number
  no_hewan: string
  jenis: 'SAPI' | 'DOMBA'
  status: string
  bobot_masuk: string
  tgl_masuk: string
  kelas_asal: { kode: string } | null
  kelas_jual: { kode: string } | null
  supplier: { nama: string } | null
}

type StatusFilter = '' | 'AVAILABLE' | 'BOOKED' | 'SOLD' | 'DELIVERED' | 'MATI'

const STATUS_MAP: Record<string, 'TERSEDIA' | 'DIPESAN' | 'TERJUAL' | 'MATI'> = {
  AVAILABLE: 'TERSEDIA',
  BOOKED:    'DIPESAN',
  SOLD:      'TERJUAL',
  DELIVERED: 'TERJUAL',
  MATI:      'MATI',
}

export default function PengadaanPage() {
  const [hewan, setHewan]         = useState<Hewan[]>([])
  const [loading, setLoading]     = useState(true)
  const [statusFilter, setStatus] = useState<StatusFilter>('')
  const [jenisFilter, setJenis]   = useState('')
  const [showModal, setShowModal] = useState(false)

  function loadHewan() {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (jenisFilter)  params.set('jenis', jenisFilter)
    api.get(`/api/hewan?${params}`)
      .then(r => setHewan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadHewan() }, [statusFilter, jenisFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Pengadaan Hewan</h1>
          <p className="text-sm text-on-surface-variant mt-1">Daftar hewan masuk depot</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Tambah Hewan</Button>
      </div>

      <StatistikPanel />

      {/* Filters */}
      <div className="flex gap-3 my-4 flex-wrap">
        <select value={statusFilter} onChange={e => setStatus(e.target.value as StatusFilter)} className="input-field w-40">
          <option value="">Semua Status</option>
          {['AVAILABLE','BOOKED','SOLD','DELIVERED','MATI'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={jenisFilter} onChange={e => setJenis(e.target.value)} className="input-field w-36">
          <option value="">Semua Jenis</option>
          <option value="SAPI">Sapi</option>
          <option value="DOMBA">Domba</option>
        </select>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['No','Jenis','Kelas Jual','Bobot','Tgl Masuk','Supplier','Status',''].map(h => (
                  <th key={h} className="pb-3 pr-3 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hewan.map((h, i) => (
                <tr key={h.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-3 font-display font-bold text-primary">{h.no_hewan}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.jenis}</td>
                  <td className="py-2.5 pr-3 font-body font-medium">{h.kelas_jual?.kode ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.bobot_masuk} kg</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.tgl_masuk}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.supplier?.nama ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    <StatusChip status={STATUS_MAP[h.status] ?? 'TERSEDIA'} />
                  </td>
                  <td className="py-2.5">
                    <Link href={`/depot/pengadaan/${h.id}`} className="text-xs text-primary hover:underline">Detail</Link>
                  </td>
                </tr>
              ))}
              {hewan.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-on-surface-variant">Belum ada hewan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {showModal && (
        <TambahHewanModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadHewan() }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create StatistikPanel**

```tsx
// frontend/app/(dashboard)/depot/pengadaan/StatistikPanel.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface Stat {
  total: number
  per_jenis: { jenis: string; total: number }[]
  per_status: { status: string; total: number }[]
}

export function StatistikPanel() {
  const [stat, setStat] = useState<Stat | null>(null)

  useEffect(() => {
    api.get(`/api/hewan/statistik?musim=${new Date().getFullYear()}`)
      .then(r => setStat(r.data))
      .catch(() => {})
  }, [])

  if (!stat) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <Card className="p-4">
        <p className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Total Hewan</p>
        <p className="font-display font-bold text-3xl text-primary mt-1">{stat.total}</p>
      </Card>
      {stat.per_jenis.map(j => (
        <Card key={j.jenis} className="p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-body">{j.jenis}</p>
          <p className="font-display font-bold text-3xl text-on-surface mt-1">{j.total}</p>
        </Card>
      ))}
      {stat.per_status.map(s => (
        <Card key={s.status} className="p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-body">{s.status}</p>
          <p className="font-display font-bold text-2xl text-accent mt-1">{s.total}</p>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create TambahHewanModal**

```tsx
// frontend/app/(dashboard)/depot/pengadaan/TambahHewanModal.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface Props { onClose: () => void; onSuccess: () => void }
interface KelasHewan { id: number; kode: string }
interface Depot { id: number; nama: string }
interface Supplier { id: number; nama: string }

export function TambahHewanModal({ onClose, onSuccess }: Props) {
  const [kelas, setKelas]       = useState<KelasHewan[]>([])
  const [depots, setDepots]     = useState<Depot[]>([])
  const [supplier, setSupplier] = useState<Supplier[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const [form, setForm] = useState({
    depot_id: '', supplier_id: '', kelas_asal_id: '', kelas_jual_id: '',
    jenis: 'SAPI', bobot_masuk: '', tgl_masuk: new Date().toISOString().split('T')[0],
    musim: String(new Date().getFullYear()),
  })

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelas(r.data.data))
    api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
    api.get('/api/supplier').then(r => setSupplier(r.data.data ?? []))
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/hewan', {
        ...form,
        depot_id: Number(form.depot_id),
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        kelas_asal_id: Number(form.kelas_asal_id),
        kelas_jual_id: Number(form.kelas_jual_id),
        bobot_masuk: parseFloat(form.bobot_masuk),
        musim: Number(form.musim),
      })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Gagal menyimpan hewan.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-on-surface/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="font-display font-semibold text-lg mb-5">Tambah Hewan Baru</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Depot</label>
              <select value={form.depot_id} onChange={e => set('depot_id', e.target.value)} className="input-field mt-1.5" required>
                <option value="">Pilih depot...</option>
                {depots.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Supplier</label>
              <select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)} className="input-field mt-1.5">
                <option value="">Pilih supplier...</option>
                {supplier.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Jenis</label>
              <select value={form.jenis} onChange={e => set('jenis', e.target.value)} className="input-field mt-1.5">
                <option value="SAPI">Sapi</option>
                <option value="DOMBA">Domba</option>
              </select>
            </div>
            <Input label="Bobot Masuk (kg)" value={form.bobot_masuk} onChange={e => set('bobot_masuk', e.target.value)} type="number" step="0.01" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Kelas Asal</label>
              <select value={form.kelas_asal_id} onChange={e => set('kelas_asal_id', e.target.value)} className="input-field mt-1.5" required>
                <option value="">Pilih kelas...</option>
                {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Kelas Jual</label>
              <select value={form.kelas_jual_id} onChange={e => set('kelas_jual_id', e.target.value)} className="input-field mt-1.5" required>
                <option value="">Pilih kelas...</option>
                {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Tanggal Masuk" value={form.tgl_masuk} onChange={e => set('tgl_masuk', e.target.value)} type="date" required />
            <Input label="Musim" value={form.musim} onChange={e => set('musim', e.target.value)} type="number" required />
          </div>

          {error && <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
            <Button type="submit" loading={loading}>Simpan Hewan</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Create detail page `app/(dashboard)/depot/pengadaan/[id]/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import api from '@/lib/api'

interface HewanDetail {
  id: number; no_hewan: string; jenis: string; status: string
  bobot_masuk: string; bobot_terkini: string | null
  tgl_masuk: string; musim: number; qr_svg: string
  kelas_asal: { kode: string }; kelas_jual: { kode: string }
  supplier: { nama: string } | null
  riwayat_perpindahan: { id: number; dari_petak_id: number | null; ke_petak_id: number | null; tgl: string; catatan: string | null; user: { name: string } | null }[]
}

const STATUS_MAP: Record<string, 'TERSEDIA' | 'DIPESAN' | 'TERJUAL' | 'MATI'> = {
  AVAILABLE: 'TERSEDIA', BOOKED: 'DIPESAN', SOLD: 'TERJUAL', DELIVERED: 'TERJUAL', MATI: 'MATI',
}

export default function HewanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [hewan, setHewan] = useState<HewanDetail | null>(null)

  useEffect(() => {
    api.get(`/api/hewan/${id}`).then(r => setHewan(r.data.hewan))
  }, [id])

  if (!hewan) return <p className="text-on-surface-variant text-sm">Memuat...</p>

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">
            Hewan #{hewan.no_hewan}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">{hewan.jenis} · Musim {hewan.musim}</p>
        </div>
        <StatusChip status={STATUS_MAP[hewan.status] ?? 'TERSEDIA'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Data Hewan</CardTitle></CardHeader>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            {[
              ['Kelas Asal', hewan.kelas_asal.kode],
              ['Kelas Jual', hewan.kelas_jual.kode],
              ['Bobot Masuk', `${hewan.bobot_masuk} kg`],
              ['Bobot Terkini', hewan.bobot_terkini ? `${hewan.bobot_terkini} kg` : '—'],
              ['Tgl Masuk', hewan.tgl_masuk],
              ['Supplier', hewan.supplier?.nama ?? '—'],
            ].map(([k, v]) => (
              <>
                <dt key={`k-${k}`} className="text-on-surface-variant font-body">{k}</dt>
                <dd key={`v-${k}`} className="font-body font-medium text-on-surface">{v}</dd>
              </>
            ))}
          </dl>
        </Card>

        <Card className="flex flex-col items-center justify-center">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-body mb-3">QR Code</p>
          <div
            className="w-32 h-32"
            dangerouslySetInnerHTML={{ __html: hewan.qr_svg }}
          />
          <p className="text-xs text-on-surface-variant mt-2 font-body">
            {hewan.id}-{hewan.musim}-{hewan.no_hewan}
          </p>
          <Button
            variant="ghost"
            className="mt-3 text-xs"
            onClick={() => window.open(`/api/hewan/cetak-label?ids=${hewan.id}`, '_blank')}
          >
            Cetak Label
          </Button>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Riwayat Perpindahan</CardTitle></CardHeader>
        {hewan.riwayat_perpindahan.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Belum ada perpindahan.</p>
        ) : (
          <div className="space-y-2">
            {hewan.riwayat_perpindahan.map(r => (
              <div key={r.id} className="flex items-center gap-3 text-sm py-1.5">
                <span className="text-on-surface-variant">{r.tgl}</span>
                <span className="text-on-surface">Petak {r.dari_petak_id ?? '—'} → {r.ke_petak_id ?? '—'}</span>
                {r.catatan && <span className="text-on-surface-variant">· {r.catatan}</span>}
                {r.user && <span className="text-xs text-on-surface-variant ml-auto">{r.user.name}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Add Pengadaan to Sidebar**

In `frontend/components/shared/Sidebar.tsx`, add `PawPrint` to lucide-react imports and add to navItems:
```tsx
{ href: '/depot/pengadaan', label: 'Pengadaan', icon: PawPrint, roles: ['SUPER_ADMIN','KEPALA_DEPOT','KANDANG_SAPI_KETUA','KANDANG_SAPI_ANGGOTA','KANDANG_DOMBA_KETUA','KANDANG_DOMBA_ANGGOTA'] },
```

- [ ] **Step 6: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend
npx tsc --noEmit
```

Fix any errors. Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/
git commit -m "feat(ui): pengadaan hewan — list+filter, tambah modal, detail+QR, statistik panel"
```

---

## Task 6: Update TASKS.md

- [ ] Mark `docs/tasks/T-03-pengadaan-hewan.md` status → `DONE`
- [ ] Update `docs/TASKS.md` T-03 row → `✅ DONE`
- [ ] Commit: `docs: mark T-03 as DONE`

---

## Acceptance Criteria Checklist

- [ ] `POST /api/hewan` auto-generates no_hewan 001, 002, ... per depot+musim
- [ ] Duplicate no_hewan per depot+musim prevented (unique constraint)
- [ ] QR code string = `{depotId}-{musim}-{noHewan}`, inline SVG di detail
- [ ] `POST /api/hewan/{id}/transfer` creates riwayat_perpindahan row
- [ ] `GET /api/hewan/statistik` returns total, per_jenis, per_status
- [ ] PDF label generated via DomPDF (5×3 cm, QR + no_hewan + kelas)
- [ ] 31 backend tests pass
- [ ] Frontend: list+filter, modal tambah, detail+QR, statistik cards
- [ ] TypeScript: 0 errors
