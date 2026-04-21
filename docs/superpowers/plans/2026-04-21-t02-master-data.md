# T-02 Master Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build master data module — 8 kelas hewan, harga beli/jual/fee per kelas per jenis per depot per musim, karyawan dengan tarif harian, yayasan untuk transaksi THQ.

**Architecture:** Laravel 11 backend (4 models, migrations, seeders, API routes) + Next.js 14 frontend (tabbed master data page). Harga immutable per transaksi — perubahan harga tidak retroaktif. Kelas global, harga per depot.

**Tech Stack:** Laravel 11, PostgreSQL, NextAuth session, Next.js 14 App Router, Tailwind (existing tokens), existing UI primitives (Button, Card, Input, StatusChip)

---

## File Map

### Backend — Created
```
backend/
  app/Models/KelasHewan.php
  app/Models/HargaKelas.php
  app/Models/Karyawan.php
  app/Models/Yayasan.php
  app/Http/Controllers/Master/KelasController.php
  app/Http/Controllers/Master/HargaController.php
  app/Http/Controllers/Master/KaryawanController.php
  app/Http/Controllers/Master/YayasanController.php
  app/Http/Requests/Master/StoreHargaRequest.php
  app/Http/Requests/Master/StoreKaryawanRequest.php
  app/Http/Requests/Master/StoreYayasanRequest.php
  database/migrations/*_create_kelas_hewan_table.php
  database/migrations/*_create_harga_kelas_table.php
  database/migrations/*_create_karyawan_table.php
  database/migrations/*_create_yayasan_table.php
  database/seeders/KelasHewanSeeder.php
  tests/Feature/Master/HargaKelasTest.php
  tests/Feature/Master/KaryawanTest.php
  tests/Feature/Master/YayasanTest.php
```

### Backend — Modified
```
  routes/api.php                  ← add master routes
  database/seeders/DatabaseSeeder.php ← call KelasHewanSeeder
```

### Frontend — Created
```
frontend/
  app/(dashboard)/admin/master-data/page.tsx   ← tabbed page
  app/(dashboard)/admin/master-data/TabHarga.tsx
  app/(dashboard)/admin/master-data/TabKaryawan.tsx
  app/(dashboard)/admin/master-data/TabYayasan.tsx
```

---

## Task 1: Migrations — 4 Tables

**Files:**
- Create: `backend/database/migrations/*_create_kelas_hewan_table.php`
- Create: `backend/database/migrations/*_create_harga_kelas_table.php`
- Create: `backend/database/migrations/*_create_karyawan_table.php`
- Create: `backend/database/migrations/*_create_yayasan_table.php`

- [ ] **Step 1: Create all 4 migrations**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan make:migration create_kelas_hewan_table
php artisan make:migration create_harga_kelas_table
php artisan make:migration create_karyawan_table
php artisan make:migration create_yayasan_table
```

- [ ] **Step 2: Edit kelas_hewan migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('kelas_hewan', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 10)->unique(); // D, C, B, A, SPR1, SPR2, SPR3, IST
            $table->string('nama', 50);           // Domba, Cukup, Bagus, dst
            $table->unsignedTinyInteger('urutan');// 1=D (terendah) .. 8=IST (tertinggi)
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('kelas_hewan'); }
};
```

- [ ] **Step 3: Edit harga_kelas migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('harga_kelas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->foreignId('kelas_id')->constrained('kelas_hewan')->cascadeOnDelete();
            $table->enum('jenis', ['SAPI', 'DOMBA']);
            $table->year('musim');                    // 2026, 2027, ...
            $table->unsignedBigInteger('harga_beli'); // HDD
            $table->unsignedBigInteger('harga_jual');
            $table->unsignedBigInteger('fee_sales')->default(0);
            $table->timestamps();

            $table->unique(['depot_id', 'kelas_id', 'jenis', 'musim'], 'harga_unique');
        });
    }
    public function down(): void { Schema::dropIfExists('harga_kelas'); }
};
```

- [ ] **Step 4: Edit karyawan migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('karyawan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->string('nama', 255);
            $table->string('divisi', 100);
            $table->unsignedBigInteger('tarif_harian')->default(0);
            $table->date('berlaku_dari');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('karyawan'); }
};
```

- [ ] **Step 5: Edit yayasan migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('yayasan', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 255);
            $table->text('alamat')->nullable();
            $table->string('kontak_pic', 255)->nullable();
            $table->string('telepon', 30)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('yayasan'); }
};
```

- [ ] **Step 6: Run migrations**

```bash
php artisan migrate
```

Expected: 4 new tables created.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/database/migrations/
git commit -m "feat(db): add kelas_hewan, harga_kelas, karyawan, yayasan tables"
```

---

## Task 2: Models + KelasHewanSeeder

**Files:**
- Create: 4 model files
- Create: `backend/database/seeders/KelasHewanSeeder.php`
- Modify: `backend/database/seeders/DatabaseSeeder.php`

- [ ] **Step 1: Create KelasHewan model**

```php
<?php
// backend/app/Models/KelasHewan.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KelasHewan extends Model
{
    protected $table = 'kelas_hewan';
    protected $fillable = ['kode', 'nama', 'urutan'];

    public function hargaKelas(): HasMany
    {
        return $this->hasMany(HargaKelas::class, 'kelas_id');
    }
}
```

- [ ] **Step 2: Create HargaKelas model**

```php
<?php
// backend/app/Models/HargaKelas.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HargaKelas extends Model
{
    protected $table = 'harga_kelas';
    protected $fillable = [
        'depot_id', 'kelas_id', 'jenis', 'musim',
        'harga_beli', 'harga_jual', 'fee_sales',
    ];

    protected $casts = [
        'harga_beli' => 'integer',
        'harga_jual' => 'integer',
        'fee_sales'  => 'integer',
        'musim'      => 'integer',
    ];

    public function depot(): BelongsTo   { return $this->belongsTo(Depot::class); }
    public function kelas(): BelongsTo   { return $this->belongsTo(KelasHewan::class, 'kelas_id'); }
}
```

- [ ] **Step 3: Create Karyawan model**

```php
<?php
// backend/app/Models/Karyawan.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Karyawan extends Model
{
    protected $fillable = [
        'user_id', 'depot_id', 'nama', 'divisi',
        'tarif_harian', 'berlaku_dari', 'is_active',
    ];

    protected $casts = [
        'tarif_harian' => 'integer',
        'berlaku_dari' => 'date',
        'is_active'    => 'boolean',
    ];

    public function depot(): BelongsTo { return $this->belongsTo(Depot::class); }
    public function user(): BelongsTo  { return $this->belongsTo(User::class); }
}
```

- [ ] **Step 4: Create Yayasan model**

```php
<?php
// backend/app/Models/Yayasan.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Yayasan extends Model
{
    protected $fillable = ['nama', 'alamat', 'kontak_pic', 'telepon', 'is_active'];
    protected $casts = ['is_active' => 'boolean'];
}
```

- [ ] **Step 5: Create KelasHewanSeeder**

```php
<?php
// backend/database/seeders/KelasHewanSeeder.php
namespace Database\Seeders;

use App\Models\KelasHewan;
use Illuminate\Database\Seeder;

class KelasHewanSeeder extends Seeder
{
    public function run(): void
    {
        $kelas = [
            ['kode' => 'D',    'nama' => 'Domba',    'urutan' => 1],
            ['kode' => 'C',    'nama' => 'Cukup',    'urutan' => 2],
            ['kode' => 'B',    'nama' => 'Bagus',    'urutan' => 3],
            ['kode' => 'A',    'nama' => 'A',        'urutan' => 4],
            ['kode' => 'SPR1', 'nama' => 'Super 1',  'urutan' => 5],
            ['kode' => 'SPR2', 'nama' => 'Super 2',  'urutan' => 6],
            ['kode' => 'SPR3', 'nama' => 'Super 3',  'urutan' => 7],
            ['kode' => 'IST',  'nama' => 'Istimewa', 'urutan' => 8],
        ];

        foreach ($kelas as $k) {
            KelasHewan::firstOrCreate(['kode' => $k['kode']], $k);
        }
    }
}
```

- [ ] **Step 6: Call seeder from DatabaseSeeder**

In `backend/database/seeders/DatabaseSeeder.php`, add `$this->call(KelasHewanSeeder::class);` at the end of `run()`.

- [ ] **Step 7: Run seeder**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan db:seed --class=KelasHewanSeeder
```

Expected: 8 rows in kelas_hewan table.

- [ ] **Step 8: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/app/Models/ backend/database/seeders/
git commit -m "feat(master): KelasHewan+HargaKelas+Karyawan+Yayasan models + KelasHewanSeeder (8 kelas)"
```

---

## Task 3: API Controllers + Routes + Tests

**Files:**
- Create: 4 controllers
- Create: 3 request classes
- Create: 3 test files
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write failing tests**

```php
<?php
// backend/tests/Feature/Master/HargaKelasTest.php
namespace Tests\Feature\Master;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\HargaKelas;
use App\Models\KelasHewan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HargaKelasTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;
    private KelasHewan $kelas;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->depot = Depot::factory()->create();
        $this->kelas = KelasHewan::create(['kode' => 'A', 'nama' => 'A', 'urutan' => 4]);
    }

    public function test_list_kelas_hewan(): void
    {
        $this->actingAs($this->superAdmin)
            ->getJson('/api/master/kelas')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'kode', 'nama', 'urutan']]]);
    }

    public function test_list_harga_per_depot_musim(): void
    {
        HargaKelas::create([
            'depot_id'   => $this->depot->id,
            'kelas_id'   => $this->kelas->id,
            'jenis'      => 'SAPI',
            'musim'      => 2026,
            'harga_beli' => 10000000,
            'harga_jual' => 12000000,
            'fee_sales'  => 100000,
        ]);

        $this->actingAs($this->superAdmin)
            ->getJson("/api/master/harga?depot={$this->depot->id}&musim=2026")
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'jenis', 'musim', 'harga_beli', 'harga_jual']]]);
    }

    public function test_store_harga_validates_jual_greater_than_beli(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/master/harga', [
                'depot_id'   => $this->depot->id,
                'kelas_id'   => $this->kelas->id,
                'jenis'      => 'SAPI',
                'musim'      => 2026,
                'harga_beli' => 12000000,
                'harga_jual' => 10000000, // jual < beli — invalid
                'fee_sales'  => 0,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['harga_jual']);
    }

    public function test_store_harga_success(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/master/harga', [
                'depot_id'   => $this->depot->id,
                'kelas_id'   => $this->kelas->id,
                'jenis'      => 'SAPI',
                'musim'      => 2026,
                'harga_beli' => 10000000,
                'harga_jual' => 12000000,
                'fee_sales'  => 100000,
            ])
            ->assertCreated()
            ->assertJsonPath('harga.jenis', 'SAPI');
    }
}
```

```php
<?php
// backend/tests/Feature/Master/KaryawanTest.php
namespace Tests\Feature\Master;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\Karyawan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KaryawanTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Depot $depot;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
        $this->depot = Depot::factory()->create();
    }

    public function test_list_karyawan_per_depot(): void
    {
        Karyawan::create([
            'depot_id'    => $this->depot->id,
            'nama'        => 'Budi',
            'divisi'      => 'Kandang',
            'tarif_harian'=> 100000,
            'berlaku_dari'=> '2026-01-01',
        ]);

        $this->actingAs($this->superAdmin)
            ->getJson("/api/karyawan?depot={$this->depot->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'nama', 'divisi', 'tarif_harian']]]);
    }

    public function test_store_karyawan(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/karyawan', [
                'depot_id'    => $this->depot->id,
                'nama'        => 'Siti Rahayu',
                'divisi'      => 'Admin',
                'tarif_harian'=> 150000,
                'berlaku_dari'=> '2026-04-01',
            ])
            ->assertCreated()
            ->assertJsonPath('karyawan.nama', 'Siti Rahayu');
    }

    public function test_update_karyawan_tarif(): void
    {
        $k = Karyawan::create([
            'depot_id'    => $this->depot->id,
            'nama'        => 'Budi',
            'divisi'      => 'Kandang',
            'tarif_harian'=> 100000,
            'berlaku_dari'=> '2026-01-01',
        ]);

        $this->actingAs($this->superAdmin)
            ->putJson("/api/karyawan/{$k->id}", ['tarif_harian' => 125000])
            ->assertOk()
            ->assertJsonPath('karyawan.tarif_harian', 125000);
    }
}
```

```php
<?php
// backend/tests/Feature/Master/YayasanTest.php
namespace Tests\Feature\Master;

use App\Models\User;
use App\Models\Yayasan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class YayasanTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superAdmin = User::factory()->superAdmin()->create();
    }

    public function test_list_yayasan(): void
    {
        Yayasan::create(['nama' => 'Yayasan Baitul Maal', 'is_active' => true]);

        $this->actingAs($this->superAdmin)
            ->getJson('/api/master/yayasan')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'nama']]]);
    }

    public function test_store_yayasan(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/master/yayasan', [
                'nama'       => 'Yayasan Al Ikhlas',
                'alamat'     => 'Jl. Kebon Jeruk No. 10',
                'kontak_pic' => 'Ustadz Ahmad',
                'telepon'    => '0812345678',
            ])
            ->assertCreated()
            ->assertJsonPath('yayasan.nama', 'Yayasan Al Ikhlas');
    }

    public function test_update_yayasan(): void
    {
        $y = Yayasan::create(['nama' => 'Lama', 'is_active' => true]);

        $this->actingAs($this->superAdmin)
            ->putJson("/api/master/yayasan/{$y->id}", ['nama' => 'Baru'])
            ->assertOk()
            ->assertJsonPath('yayasan.nama', 'Baru');
    }
}
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd backend
php artisan test tests/Feature/Master/
```

Expected: FAIL — controllers not found.

- [ ] **Step 3: Create StoreHargaRequest**

```php
<?php
// backend/app/Http/Requests/Master/StoreHargaRequest.php
namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;

class StoreHargaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id'   => ['required', 'exists:depots,id'],
            'kelas_id'   => ['required', 'exists:kelas_hewan,id'],
            'jenis'      => ['required', 'in:SAPI,DOMBA'],
            'musim'      => ['required', 'integer', 'min:2020', 'max:2100'],
            'harga_beli' => ['required', 'integer', 'min:0'],
            'harga_jual' => ['required', 'integer', 'gt:harga_beli'],
            'fee_sales'  => ['sometimes', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'harga_jual.gt' => 'Harga jual harus lebih besar dari harga beli.',
        ];
    }
}
```

- [ ] **Step 4: Create StoreKaryawanRequest**

```php
<?php
// backend/app/Http/Requests/Master/StoreKaryawanRequest.php
namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;

class StoreKaryawanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id'    => ['required', 'exists:depots,id'],
            'user_id'     => ['sometimes', 'nullable', 'exists:users,id'],
            'nama'        => ['required', 'string', 'max:255'],
            'divisi'      => ['required', 'string', 'max:100'],
            'tarif_harian'=> ['required', 'integer', 'min:0'],
            'berlaku_dari'=> ['required', 'date'],
        ];
    }
}
```

- [ ] **Step 5: Create StoreYayasanRequest**

```php
<?php
// backend/app/Http/Requests/Master/StoreYayasanRequest.php
namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;

class StoreYayasanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nama'       => ['required', 'string', 'max:255'],
            'alamat'     => ['sometimes', 'nullable', 'string'],
            'kontak_pic' => ['sometimes', 'nullable', 'string', 'max:255'],
            'telepon'    => ['sometimes', 'nullable', 'string', 'max:30'],
        ];
    }
}
```

- [ ] **Step 6: Create KelasController**

```php
<?php
// backend/app/Http/Controllers/Master/KelasController.php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\KelasHewan;
use Illuminate\Http\JsonResponse;

class KelasController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => KelasHewan::orderBy('urutan')->get()]);
    }
}
```

- [ ] **Step 7: Create HargaController**

```php
<?php
// backend/app/Http/Controllers/Master/HargaController.php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\StoreHargaRequest;
use App\Models\HargaKelas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HargaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = HargaKelas::with('kelas:id,kode,nama,urutan')
            ->when($request->depot, fn($q) => $q->where('depot_id', $request->depot))
            ->when($request->musim, fn($q) => $q->where('musim', $request->musim))
            ->orderBy('jenis')
            ->orderByRelation('kelas', 'urutan');

        return response()->json(['data' => $query->get()]);
    }

    public function store(StoreHargaRequest $request): JsonResponse
    {
        $harga = HargaKelas::updateOrCreate(
            [
                'depot_id' => $request->depot_id,
                'kelas_id' => $request->kelas_id,
                'jenis'    => $request->jenis,
                'musim'    => $request->musim,
            ],
            [
                'harga_beli' => $request->harga_beli,
                'harga_jual' => $request->harga_jual,
                'fee_sales'  => $request->fee_sales ?? 0,
            ]
        );

        return response()->json(['harga' => $harga->load('kelas')], 201);
    }

    public function update(StoreHargaRequest $request, HargaKelas $harga): JsonResponse
    {
        $harga->update($request->only(['harga_beli', 'harga_jual', 'fee_sales']));

        return response()->json(['harga' => $harga->fresh()->load('kelas')]);
    }
}
```

- [ ] **Step 8: Create KaryawanController**

```php
<?php
// backend/app/Http/Controllers/Master/KaryawanController.php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\StoreKaryawanRequest;
use App\Models\Karyawan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KaryawanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $karyawan = Karyawan::with('user:id,name,email')
            ->when($request->depot, fn($q) => $q->where('depot_id', $request->depot))
            ->orderBy('nama')
            ->get();

        return response()->json(['data' => $karyawan]);
    }

    public function store(StoreKaryawanRequest $request): JsonResponse
    {
        $karyawan = Karyawan::create($request->validated());

        return response()->json(['karyawan' => $karyawan], 201);
    }

    public function update(Request $request, Karyawan $karyawan): JsonResponse
    {
        $data = $request->validate([
            'nama'         => ['sometimes', 'string', 'max:255'],
            'divisi'       => ['sometimes', 'string', 'max:100'],
            'tarif_harian' => ['sometimes', 'integer', 'min:0'],
            'berlaku_dari' => ['sometimes', 'date'],
            'is_active'    => ['sometimes', 'boolean'],
        ]);

        $karyawan->update($data);

        return response()->json(['karyawan' => $karyawan->fresh()]);
    }
}
```

- [ ] **Step 9: Create YayasanController**

```php
<?php
// backend/app/Http/Controllers/Master/YayasanController.php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\StoreYayasanRequest;
use App\Models\Yayasan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class YayasanController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Yayasan::where('is_active', true)->orderBy('nama')->get()]);
    }

    public function store(StoreYayasanRequest $request): JsonResponse
    {
        $yayasan = Yayasan::create($request->validated());

        return response()->json(['yayasan' => $yayasan], 201);
    }

    public function update(Request $request, Yayasan $yayasan): JsonResponse
    {
        $data = $request->validate([
            'nama'       => ['sometimes', 'string', 'max:255'],
            'alamat'     => ['sometimes', 'nullable', 'string'],
            'kontak_pic' => ['sometimes', 'nullable', 'string', 'max:255'],
            'telepon'    => ['sometimes', 'nullable', 'string', 'max:30'],
            'is_active'  => ['sometimes', 'boolean'],
        ]);

        $yayasan->update($data);

        return response()->json(['yayasan' => $yayasan->fresh()]);
    }
}
```

- [ ] **Step 10: Add routes to api.php**

In `backend/routes/api.php`, inside the `auth:sanctum` middleware group, add:

```php
// Master Data — read: all authenticated; write: SUPER_ADMIN + KEPALA_DEPOT
Route::prefix('master')->group(function () {
    Route::get('kelas',   [\App\Http\Controllers\Master\KelasController::class,  'index']);
    Route::get('harga',   [\App\Http\Controllers\Master\HargaController::class,  'index']);
    Route::get('yayasan', [\App\Http\Controllers\Master\YayasanController::class,'index']);

    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT')->group(function () {
        Route::post('harga',          [\App\Http\Controllers\Master\HargaController::class,  'store']);
        Route::put('harga/{harga}',   [\App\Http\Controllers\Master\HargaController::class,  'update']);
        Route::post('yayasan',        [\App\Http\Controllers\Master\YayasanController::class,'store']);
        Route::put('yayasan/{yayasan}', [\App\Http\Controllers\Master\YayasanController::class,'update']);
    });
});

Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT')->group(function () {
    Route::get('karyawan',           [\App\Http\Controllers\Master\KaryawanController::class,'index']);
    Route::post('karyawan',          [\App\Http\Controllers\Master\KaryawanController::class,'store']);
    Route::put('karyawan/{karyawan}',[\App\Http\Controllers\Master\KaryawanController::class,'update']);
});
```

- [ ] **Step 11: Fix HargaController — orderByRelation not valid in all Laravel versions**

Replace `->orderByRelation('kelas', 'urutan')` with a join:

```php
public function index(Request $request): JsonResponse
{
    $data = HargaKelas::with('kelas:id,kode,nama,urutan')
        ->join('kelas_hewan', 'harga_kelas.kelas_id', '=', 'kelas_hewan.id')
        ->when($request->depot, fn($q) => $q->where('harga_kelas.depot_id', $request->depot))
        ->when($request->musim, fn($q) => $q->where('musim', $request->musim))
        ->orderBy('jenis')
        ->orderBy('kelas_hewan.urutan')
        ->select('harga_kelas.*')
        ->get();

    return response()->json(['data' => $data]);
}
```

- [ ] **Step 12: Run all tests**

```bash
cd /c/Users/USER/projects/simhq/backend
php artisan test
```

Expected: 22 tests pass (12 from T-01 + 10 new).

- [ ] **Step 13: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add backend/
git commit -m "feat(master): Harga+Karyawan+Yayasan API controllers + 10 tests passing"
```

---

## Task 4: Frontend — Master Data Page

**Files:**
- Create: `frontend/app/(dashboard)/admin/master-data/page.tsx`
- Create: `frontend/app/(dashboard)/admin/master-data/TabHarga.tsx`
- Create: `frontend/app/(dashboard)/admin/master-data/TabKaryawan.tsx`
- Create: `frontend/app/(dashboard)/admin/master-data/TabYayasan.tsx`

- [ ] **Step 1: Create TabHarga.tsx**

```tsx
// frontend/app/(dashboard)/admin/master-data/TabHarga.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'

interface KelasHewan { id: number; kode: string; nama: string; urutan: number }
interface Depot      { id: number; nama: string }
interface Harga {
  id: number; jenis: string; musim: number
  harga_beli: number; harga_jual: number; fee_sales: number
  kelas: KelasHewan
}

export function TabHarga() {
  const [kelas, setKelas]   = useState<KelasHewan[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [harga, setHarga]   = useState<Harga[]>([])
  const [depotId, setDepotId] = useState<string>('')
  const [musim, setMusim]   = useState<string>(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelas(r.data.data))
    api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
  }, [])

  function loadHarga() {
    if (!depotId) return
    setLoading(true)
    api.get(`/api/master/harga?depot=${depotId}&musim=${musim}`)
      .then(r => setHarga(r.data.data))
      .finally(() => setLoading(false))
  }

  function fmt(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Depot</label>
          <select
            value={depotId}
            onChange={e => setDepotId(e.target.value)}
            className="input-field mt-1.5"
          >
            <option value="">Pilih depot...</option>
            {depots.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Musim</label>
          <Input
            value={musim}
            onChange={e => setMusim(e.target.value)}
            className="mt-1.5 w-28"
          />
        </div>
        <Button onClick={loadHarga} disabled={!depotId}>Tampilkan</Button>
      </div>

      {loading && <p className="text-sm text-on-surface-variant">Memuat...</p>}

      {harga.length > 0 && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Kelas','Jenis','Harga Beli','Harga Jual','Fee Sales'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {harga.map((h, i) => (
                <tr key={h.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-4 font-body font-medium">{h.kelas.kode}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{h.jenis}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface">{fmt(h.harga_beli)}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface">{fmt(h.harga_jual)}</td>
                  <td className="py-2.5 font-body text-on-surface-variant">{fmt(h.fee_sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {harga.length === 0 && depotId && !loading && (
        <p className="text-sm text-on-surface-variant text-center py-8">
          Belum ada harga untuk depot + musim ini.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create TabKaryawan.tsx**

```tsx
// frontend/app/(dashboard)/admin/master-data/TabKaryawan.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import api from '@/lib/api'

interface Karyawan {
  id: number; nama: string; divisi: string
  tarif_harian: number; berlaku_dari: string; is_active: boolean
}

export function TabKaryawan() {
  const [karyawan, setKaryawan] = useState<Karyawan[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get('/api/karyawan')
      .then(r => setKaryawan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  function fmt(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button>+ Tambah Karyawan</Button>
      </div>
      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Nama','Divisi','Tarif Harian','Berlaku Dari','Status'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {karyawan.map((k, i) => (
                <tr key={k.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-4 font-body font-medium text-on-surface">{k.nama}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{k.divisi}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface">{fmt(k.tarif_harian)}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{k.berlaku_dari}</td>
                  <td className="py-2.5">
                    <StatusChip status={k.is_active ? 'AKTIF' : 'NONAKTIF'} />
                  </td>
                </tr>
              ))}
              {karyawan.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-variant">Belum ada karyawan.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Create TabYayasan.tsx**

```tsx
// frontend/app/(dashboard)/admin/master-data/TabYayasan.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import api from '@/lib/api'

interface Yayasan {
  id: number; nama: string; alamat: string | null
  kontak_pic: string | null; telepon: string | null; is_active: boolean
}

export function TabYayasan() {
  const [yayasan, setYayasan] = useState<Yayasan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/master/yayasan')
      .then(r => setYayasan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button>+ Tambah Yayasan</Button>
      </div>
      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Nama Yayasan','Kontak PIC','Telepon','Status'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yayasan.map((y, i) => (
                <tr key={y.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-4">
                    <p className="font-body font-medium text-on-surface">{y.nama}</p>
                    {y.alamat && <p className="text-xs text-on-surface-variant">{y.alamat}</p>}
                  </td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{y.kontak_pic ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{y.telepon ?? '—'}</td>
                  <td className="py-2.5">
                    <StatusChip status={y.is_active ? 'AKTIF' : 'NONAKTIF'} />
                  </td>
                </tr>
              ))}
              {yayasan.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-on-surface-variant">Belum ada yayasan.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Create master-data page.tsx**

```tsx
// frontend/app/(dashboard)/admin/master-data/page.tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TabHarga } from './TabHarga'
import { TabKaryawan } from './TabKaryawan'
import { TabYayasan } from './TabYayasan'

const tabs = [
  { id: 'harga',    label: 'Harga Kelas' },
  { id: 'karyawan', label: 'Karyawan' },
  { id: 'yayasan',  label: 'Yayasan THQ' },
]

export default function MasterDataPage() {
  const [active, setActive] = useState('harga')

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-on-surface">Master Data</h1>
        <p className="text-sm text-on-surface-variant mt-1">Kelas hewan, harga, karyawan, dan yayasan THQ</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-high p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-body font-medium transition-colors',
              active === t.id
                ? 'bg-surface-lowest text-on-surface shadow-card'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === 'harga'    && <TabHarga />}
      {active === 'karyawan' && <TabKaryawan />}
      {active === 'yayasan'  && <TabYayasan />}
    </div>
  )
}
```

- [ ] **Step 5: Add Master Data to Sidebar nav**

In `frontend/components/shared/Sidebar.tsx`, add to `navItems` after `admin/users`:

```tsx
{ href: '/admin/master-data', label: 'Master Data', icon: Database, roles: ['SUPER_ADMIN', 'KEPALA_DEPOT'] },
```

Import `Database` from `lucide-react`.

- [ ] **Step 6: TypeScript check**

```bash
cd /c/Users/USER/projects/simhq/frontend
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add frontend/
git commit -m "feat(ui): master data page — tabs Harga/Karyawan/Yayasan"
```

---

## Task 5: Update TASKS.md

- [ ] **Step 1: Update T-02 status**

Change `**Status:** \`TODO\`` to `**Status:** \`DONE\`` in `docs/tasks/T-02-master-data.md`.

Update T-02 row in `docs/TASKS.md` from `⬜ TODO` to `✅ DONE`.

- [ ] **Step 2: Commit**

```bash
cd /c/Users/USER/projects/simhq
git add docs/
git commit -m "docs: mark T-02 as DONE"
```

---

## Acceptance Criteria Checklist

- [ ] 8 kelas tersedia di DB (D/C/B/A/SPR1/SPR2/SPR3/IST) via KelasHewanSeeder
- [ ] `GET /api/master/kelas` returns 8 kelas ordered by urutan
- [ ] `POST /api/master/harga` rejects harga_jual <= harga_beli
- [ ] `POST /api/master/harga` upserts (updateOrCreate) per depot+kelas+jenis+musim
- [ ] Harga stored as integer (rupiah, no decimal)
- [ ] Karyawan CRUD scoped per depot
- [ ] Yayasan list only returns is_active=true
- [ ] All 22 backend tests pass
- [ ] Frontend: 3 tabs render without TypeScript errors
- [ ] Sidebar shows "Master Data" for SUPER_ADMIN/KEPALA_DEPOT
