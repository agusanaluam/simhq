# POS: Beli 1/7 Slot Sapi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** POS bisa jual 1/7 slot sapi langsung — otomatis sinkron ke halaman ploting, dengan harga slot dari master harga.

**Architecture:** Backend — 2 migrations, model updates, HargaController accepts `harga_slot`, StoreTransaksiRequest adds `satuan`+`nama_qurban` per item, TransaksiController::store auto-creates SlotSapi for SLOT items with next available no_slot. Frontend — TabHarga tambah harga_slot field, TipeQurbanModal tambah satuan toggle + nama_qurban, HewanBrowser tampil slot badge, CartItem interface extended.

**Tech Stack:** Laravel 11, PostgreSQL, Next.js 14, TypeScript, Tailwind

---

## File Map

### Backend — Created
```
backend/database/migrations/XXXX_add_harga_slot_to_harga_kelas_table.php
backend/database/migrations/XXXX_add_satuan_nama_qurban_to_transaksi_items_table.php
```

### Backend — Modified
```
backend/app/Models/HargaKelas.php
backend/app/Models/TransaksiItem.php
backend/app/Http/Requests/Master/StoreHargaRequest.php
backend/app/Http/Controllers/Master/HargaController.php
backend/app/Http/Requests/StoreTransaksiRequest.php
backend/app/Http/Controllers/TransaksiController.php
backend/app/Http/Controllers/HewanController.php      ← add withCount('slotSapi')
backend/tests/Feature/POS/POSImprovementsTest.php     ← add 3 new tests
```

### Frontend — Modified
```
frontend/app/(dashboard)/admin/master-data/TabHarga.tsx        ← add harga_slot field
frontend/app/(dashboard)/depot/pos/TipeQurbanModal.tsx         ← satuan toggle + nama_qurban
frontend/app/(dashboard)/depot/pos/HewanBrowser.tsx            ← slot badge, pass hargaSlot+slotTerisi
frontend/app/(dashboard)/depot/pos/PreorderModal.tsx           ← satuan toggle + nama_qurban
frontend/app/(dashboard)/depot/pos/page.tsx                    ← extend CartItem + API payload
frontend/app/(dashboard)/depot/pos/CartPanel.tsx               ← display namaQurban in cart
```

---

## Task 1: Migrations

### Files
- Create: `backend/database/migrations/XXXX_add_harga_slot_to_harga_kelas_table.php`
- Create: `backend/database/migrations/XXXX_add_satuan_nama_qurban_to_transaksi_items_table.php`

- [ ] **Step 1: Generate both migrations**

```bash
cd C:/Users/USER/projects/simhq/backend
php artisan make:migration add_harga_slot_to_harga_kelas_table --table=harga_kelas
php artisan make:migration add_satuan_nama_qurban_to_transaksi_items_table --table=transaksi_items
```

- [ ] **Step 2: Fill harga_kelas migration**

Open the generated `*_add_harga_slot_to_harga_kelas_table.php`, replace `up()` and `down()`:

```php
public function up(): void
{
    Schema::table('harga_kelas', function (Blueprint $table) {
        $table->unsignedBigInteger('harga_slot')->nullable()->after('harga_jual');
    });
}

public function down(): void
{
    Schema::table('harga_kelas', function (Blueprint $table) {
        $table->dropColumn('harga_slot');
    });
}
```

- [ ] **Step 3: Fill transaksi_items migration**

Open the generated `*_add_satuan_nama_qurban_to_transaksi_items_table.php`, replace `up()` and `down()`:

```php
public function up(): void
{
    Schema::table('transaksi_items', function (Blueprint $table) {
        $table->enum('satuan', ['EKOR', 'SLOT'])->default('EKOR')->after('is_preorder');
        $table->string('nama_qurban', 150)->nullable()->after('satuan');
    });
}

public function down(): void
{
    Schema::table('transaksi_items', function (Blueprint $table) {
        $table->dropColumn(['satuan', 'nama_qurban']);
    });
}
```

- [ ] **Step 4: Run migrations**

```bash
php artisan migrate
```

Expected: two migrations run, no errors.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/USER/projects/simhq
git add backend/database/migrations/
git commit -m "feat(db): add harga_slot to harga_kelas, satuan+nama_qurban to transaksi_items"
```

---

## Task 2: Backend Models + Requests + HargaController

### Files
- Modify: `backend/app/Models/HargaKelas.php`
- Modify: `backend/app/Models/TransaksiItem.php`
- Modify: `backend/app/Http/Requests/Master/StoreHargaRequest.php`
- Modify: `backend/app/Http/Controllers/Master/HargaController.php`
- Modify: `backend/app/Http/Requests/StoreTransaksiRequest.php`

- [ ] **Step 1: Update HargaKelas model**

Open `backend/app/Models/HargaKelas.php`. Replace `$fillable` and `$casts`:

```php
protected $fillable = [
    'depot_id', 'kelas_id', 'jenis', 'musim',
    'harga_beli', 'harga_jual', 'harga_slot', 'fee_sales',
];

protected $casts = [
    'harga_beli' => 'integer',
    'harga_jual' => 'integer',
    'harga_slot' => 'integer',
    'fee_sales'  => 'integer',
    'musim'      => 'integer',
];
```

- [ ] **Step 2: Update TransaksiItem model**

Open `backend/app/Models/TransaksiItem.php`. Replace `$fillable` and `$casts`:

```php
protected $fillable = [
    'transaksi_id', 'hewan_id', 'jenis', 'kelas_id',
    'tipe_qurban', 'harga', 'is_preorder', 'satuan', 'nama_qurban',
];

protected $casts = [
    'is_preorder' => 'boolean',
    'harga'       => 'integer',
];
```

- [ ] **Step 3: Update StoreHargaRequest**

Open `backend/app/Http/Requests/Master/StoreHargaRequest.php`. Add `harga_slot` rule inside `rules()`:

```php
public function rules(): array
{
    return [
        'depot_id'   => ['required', 'exists:depots,id'],
        'kelas_id'   => ['required', 'exists:kelas_hewan,id'],
        'jenis'      => ['required', 'in:SAPI,DOMBA'],
        'musim'      => ['required', 'integer', 'min:2020', 'max:2100'],
        'harga_beli' => ['required', 'integer', 'min:0'],
        'harga_jual' => ['required', 'integer', 'gt:harga_beli'],
        'harga_slot' => ['nullable', 'integer', 'min:0'],
        'fee_sales'  => ['sometimes', 'integer', 'min:0'],
    ];
}
```

- [ ] **Step 4: Update HargaController store() and update()**

Open `backend/app/Http/Controllers/Master/HargaController.php`.

Replace `store()`:

```php
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
            'harga_slot' => $request->harga_slot,
            'fee_sales'  => $request->fee_sales ?? 0,
        ]
    );

    return response()->json(['harga' => $harga->load('kelas')], 201);
}
```

Replace `update()`:

```php
public function update(Request $request, HargaKelas $harga): JsonResponse
{
    $data = $request->validate([
        'harga_beli' => ['required', 'integer', 'min:0'],
        'harga_jual' => ['required', 'integer', 'gt:harga_beli'],
        'harga_slot' => ['nullable', 'integer', 'min:0'],
        'fee_sales'  => ['sometimes', 'integer', 'min:0'],
    ]);

    $harga->update($data);

    return response()->json(['harga' => $harga->fresh()->load('kelas')]);
}
```

- [ ] **Step 5: Update StoreTransaksiRequest**

Open `backend/app/Http/Requests/StoreTransaksiRequest.php`. Add two lines inside the `items.*` section:

```php
'items.*.satuan'      => ['nullable', 'in:EKOR,SLOT'],
'items.*.nama_qurban' => ['nullable', 'string', 'max:150'],
```

Add them after `'items.*.is_preorder'`.

- [ ] **Step 6: Run existing tests — confirm no regression**

```bash
cd C:/Users/USER/projects/simhq/backend
php artisan test
```

Expected: 242 passed (existing count), 0 failures.

- [ ] **Step 7: Commit**

```bash
cd C:/Users/USER/projects/simhq
git add backend/app/Models/HargaKelas.php \
        backend/app/Models/TransaksiItem.php \
        backend/app/Http/Requests/Master/StoreHargaRequest.php \
        backend/app/Http/Controllers/Master/HargaController.php \
        backend/app/Http/Requests/StoreTransaksiRequest.php
git commit -m "feat(pos-slot): model fillable + request validation for harga_slot + satuan"
```

---

## Task 3: Backend — HewanController slot count

### Files
- Modify: `backend/app/Http/Controllers/HewanController.php`

- [ ] **Step 1: Find the index() method**

Open `backend/app/Http/Controllers/HewanController.php`. Find the `index()` method — it builds a query on `Hewan::`.

- [ ] **Step 2: Add withCount('slotSapi')**

Find the Hewan query chain in `index()`. Add `->withCount('slotSapi')` to it. The line should appear before `->paginate()` or `->get()`. For example, if index() has:

```php
$query = Hewan::with([...])->when(...)->...->orderBy('no_hewan');
return response()->json(['data' => $query->paginate(...)]);
```

Change to:

```php
$query = Hewan::with([...])->when(...)->...->withCount('slotSapi')->orderBy('no_hewan');
```

Add it to any chain that exists. Do NOT change any other logic — just insert `->withCount('slotSapi')` in the chain.

- [ ] **Step 3: Run tests**

```bash
cd C:/Users/USER/projects/simhq/backend
php artisan test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/USER/projects/simhq
git add backend/app/Http/Controllers/HewanController.php
git commit -m "feat(hewan): include slot_sapi_count in index response"
```

---

## Task 4: Backend — TransaksiController auto-create SlotSapi (TDD)

### Files
- Modify: `backend/app/Http/Controllers/TransaksiController.php`
- Modify: `backend/tests/Feature/POS/POSImprovementsTest.php`

- [ ] **Step 1: Add imports to TransaksiController**

Open `backend/app/Http/Controllers/TransaksiController.php`. Verify `SlotSapi` is imported. If not, add:

```php
use App\Models\SlotSapi;
```

- [ ] **Step 2: Write 3 failing tests**

Open `backend/tests/Feature/POS/POSImprovementsTest.php`. Add at the end of the class (before final `}`):

```php
public function test_pos_slot_auto_create_slot_sapi(): void
{
    $customer = Customer::create(['nama' => 'Siti', 'hp' => '08222']);
    $hewan    = \App\Models\Hewan::create([
        'depot_id'      => $this->depot->id,
        'kelas_asal_id' => $this->kelas->id,
        'kelas_jual_id' => $this->kelas->id,
        'no_hewan'      => 'S01',
        'jenis'         => 'SAPI',
        'bobot_masuk'   => 300,
        'tgl_masuk'     => '2026-04-01',
        'musim'         => 2026,
        'status'        => 'AVAILABLE',
    ]);

    $this->actingAs($this->superAdmin)
        ->postJson('/api/transaksi', [
            'depot_id'    => $this->depot->id,
            'customer_id' => $customer->id,
            'musim'       => 2026,
            'items'       => [[
                'jenis'       => 'SAPI',
                'kelas_id'    => $this->kelas->id,
                'tipe_qurban' => 'PHQ',
                'harga'       => 900_000,
                'is_preorder' => false,
                'hewan_id'    => $hewan->id,
                'satuan'      => 'SLOT',
                'nama_qurban' => 'Ahmad bin Budi',
            ]],
        ])
        ->assertCreated();

    $this->assertDatabaseHas('slot_sapi', [
        'hewan_id'    => $hewan->id,
        'no_slot'     => 1,
        'customer_id' => $customer->id,
        'tipe_qurban' => 'PHQ',
        'harga_slot'  => 900_000,
        'nama_qurban' => 'Ahmad bin Budi',
        'status_bayar'=> 'DP',
    ]);
}

public function test_pos_slot_auto_assigns_next_available_slot(): void
{
    $customer = Customer::create(['nama' => 'Siti', 'hp' => '08222']);
    $hewan    = \App\Models\Hewan::create([
        'depot_id'      => $this->depot->id,
        'kelas_asal_id' => $this->kelas->id,
        'kelas_jual_id' => $this->kelas->id,
        'no_hewan'      => 'S02',
        'jenis'         => 'SAPI',
        'bobot_masuk'   => 300,
        'tgl_masuk'     => '2026-04-01',
        'musim'         => 2026,
        'status'        => 'AVAILABLE',
    ]);

    // Pre-fill slots 1 and 2
    \App\Models\SlotSapi::insert([
        ['hewan_id' => $hewan->id, 'no_slot' => 1, 'customer_id' => $customer->id, 'nama_qurban' => 'A', 'tipe_qurban' => 'SHQ', 'harga_slot' => 900000, 'status_bayar' => 'DP', 'created_at' => now(), 'updated_at' => now()],
        ['hewan_id' => $hewan->id, 'no_slot' => 2, 'customer_id' => $customer->id, 'nama_qurban' => 'B', 'tipe_qurban' => 'SHQ', 'harga_slot' => 900000, 'status_bayar' => 'DP', 'created_at' => now(), 'updated_at' => now()],
    ]);

    $this->actingAs($this->superAdmin)
        ->postJson('/api/transaksi', [
            'depot_id'    => $this->depot->id,
            'customer_id' => $customer->id,
            'musim'       => 2026,
            'items'       => [[
                'jenis'       => 'SAPI',
                'kelas_id'    => $this->kelas->id,
                'tipe_qurban' => 'SHQ',
                'harga'       => 900_000,
                'is_preorder' => false,
                'hewan_id'    => $hewan->id,
                'satuan'      => 'SLOT',
                'nama_qurban' => null,
            ]],
        ])
        ->assertCreated();

    $this->assertDatabaseHas('slot_sapi', [
        'hewan_id' => $hewan->id,
        'no_slot'  => 3,   // next available after 1 and 2
    ]);
}

public function test_pos_slot_penuh_returns_422(): void
{
    $customer = Customer::create(['nama' => 'Siti', 'hp' => '08222']);
    $hewan    = \App\Models\Hewan::create([
        'depot_id'      => $this->depot->id,
        'kelas_asal_id' => $this->kelas->id,
        'kelas_jual_id' => $this->kelas->id,
        'no_hewan'      => 'S03',
        'jenis'         => 'SAPI',
        'bobot_masuk'   => 300,
        'tgl_masuk'     => '2026-04-01',
        'musim'         => 2026,
        'status'        => 'AVAILABLE',
    ]);

    // Fill all 7 slots
    $rows = [];
    for ($i = 1; $i <= 7; $i++) {
        $rows[] = ['hewan_id' => $hewan->id, 'no_slot' => $i, 'customer_id' => $customer->id, 'nama_qurban' => 'X', 'tipe_qurban' => 'SHQ', 'harga_slot' => 900000, 'status_bayar' => 'DP', 'created_at' => now(), 'updated_at' => now()];
    }
    \App\Models\SlotSapi::insert($rows);

    $this->actingAs($this->superAdmin)
        ->postJson('/api/transaksi', [
            'depot_id'    => $this->depot->id,
            'customer_id' => $customer->id,
            'musim'       => 2026,
            'items'       => [[
                'jenis'       => 'SAPI',
                'kelas_id'    => $this->kelas->id,
                'tipe_qurban' => 'SHQ',
                'harga'       => 900_000,
                'is_preorder' => false,
                'hewan_id'    => $hewan->id,
                'satuan'      => 'SLOT',
                'nama_qurban' => null,
            ]],
        ])
        ->assertUnprocessable();
}

public function test_pos_ekor_tidak_buat_slot_sapi(): void
{
    $customer = Customer::create(['nama' => 'Siti', 'hp' => '08222']);

    $this->actingAs($this->superAdmin)
        ->postJson('/api/transaksi', [
            'depot_id'    => $this->depot->id,
            'customer_id' => $customer->id,
            'musim'       => 2026,
            'items'       => [[
                'jenis'       => 'SAPI',
                'kelas_id'    => $this->kelas->id,
                'tipe_qurban' => 'SHQ',
                'harga'       => 6_000_000,
                'is_preorder' => true,
                'hewan_id'    => null,
                'satuan'      => 'EKOR',
                'nama_qurban' => null,
            ]],
        ])
        ->assertCreated();

    $this->assertDatabaseCount('slot_sapi', 0);
}
```

- [ ] **Step 3: Run tests — confirm all 4 FAIL**

```bash
cd C:/Users/USER/projects/simhq/backend
php artisan test tests/Feature/POS/POSImprovementsTest.php --filter="test_pos_slot"
```

Expected: 4 failures (SlotSapi not created / 422 not returned).

- [ ] **Step 4: Implement auto-create SlotSapi in TransaksiController::store()**

Open `backend/app/Http/Controllers/TransaksiController.php`.

Replace the `store()` method with:

```php
public function store(StoreTransaksiRequest $request): JsonResponse
{
    $data               = $request->validated();
    $items              = $data['items'] ?? [];
    $totalHarga         = collect($items)->sum('harga');
    $totalBiayaTambahan = ($data['ongkos_kirim'] ?? 0) + ($data['biaya_potong'] ?? 0);

    $hasPreorder = collect($items)->contains('is_preorder', true);
    $status      = $hasPreorder
        ? StatusTransaksi::MENUNGGU_HEWAN->value
        : StatusTransaksi::HEWAN_TERALOKASI->value;

    // Validate slots are available before starting transaction
    foreach ($items as $item) {
        if (($item['satuan'] ?? 'EKOR') === 'SLOT' && !($item['is_preorder'] ?? false) && !empty($item['hewan_id'])) {
            $taken = SlotSapi::where('hewan_id', $item['hewan_id'])->pluck('no_slot')->toArray();
            $available = array_diff(range(1, 7), $taken);
            abort_if(empty($available), 422, "Slot sapi #{$item['hewan_id']} sudah penuh.");
        }
    }

    $transaksi = DB::transaction(function () use ($data, $items, $totalHarga, $totalBiayaTambahan, $status) {
        $noFaktur = $this->svc->generateNoFaktur($data['depot_id'], $data['musim']);

        $transaksi = Transaksi::create(array_merge(
            Arr::except($data, ['items']),
            [
                'no_faktur'        => $noFaktur,
                'harga'            => $totalHarga,
                'total'            => $totalHarga + $totalBiayaTambahan,
                'status_transaksi' => $status,
            ]
        ));

        foreach ($items as $item) {
            TransaksiItem::create(array_merge($item, ['transaksi_id' => $transaksi->id]));

            if (!($item['is_preorder'] ?? false) && !empty($item['hewan_id'])) {
                $satuan = $item['satuan'] ?? 'EKOR';

                if ($satuan === 'SLOT') {
                    $taken     = SlotSapi::where('hewan_id', $item['hewan_id'])->lockForUpdate()->pluck('no_slot')->toArray();
                    $available = array_diff(range(1, 7), $taken);
                    abort_if(empty($available), 422, "Slot sapi #{$item['hewan_id']} sudah penuh.");
                    $noSlot    = min($available);

                    SlotSapi::create([
                        'hewan_id'    => $item['hewan_id'],
                        'no_slot'     => $noSlot,
                        'transaksi_id'=> $transaksi->id,
                        'customer_id' => $data['customer_id'],
                        'nama_qurban' => $item['nama_qurban'] ?? '',
                        'tipe_qurban' => $item['tipe_qurban'],
                        'harga_slot'  => $item['harga'],
                        'status_bayar'=> 'DP',
                    ]);

                    $hewan = Hewan::find($item['hewan_id']);
                    if ($hewan) {
                        $slotCount = SlotSapi::where('hewan_id', $hewan->id)->count();
                        $hewan->update(['status' => $slotCount >= 7
                            ? StatusHewan::SOLD->value
                            : StatusHewan::BOOKED->value]);
                    }
                } else {
                    Hewan::where('id', $item['hewan_id'])->update(['status' => StatusHewan::BOOKED->value]);
                }
            }
        }

        return $transaksi;
    });

    return response()->json([
        'transaksi' => $transaksi->load(['items.kelas', 'customer']),
    ], 201);
}
```

- [ ] **Step 5: Run 4 new tests — confirm PASS**

```bash
cd C:/Users/USER/projects/simhq/backend
php artisan test tests/Feature/POS/POSImprovementsTest.php --filter="test_pos_slot|test_pos_ekor"
```

Expected: 4 tests pass.

- [ ] **Step 6: Run full suite — no regression**

```bash
php artisan test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
cd C:/Users/USER/projects/simhq
git add backend/app/Http/Controllers/TransaksiController.php \
        backend/tests/Feature/POS/POSImprovementsTest.php
git commit -m "feat(pos-slot): auto-create SlotSapi for SLOT items + 4 tests"
```

---

## Task 5: Frontend — TabHarga.tsx harga_slot

### Files
- Modify: `frontend/app/(dashboard)/admin/master-data/TabHarga.tsx`

- [ ] **Step 1: Add harga_slot to Harga interface**

Open `TabHarga.tsx`. Replace the `Harga` interface:

```typescript
interface Harga {
  id: number; jenis: string; musim: number
  harga_beli: number; harga_jual: number; harga_slot: number | null; fee_sales: number
  kelas: KelasHewan
}
```

- [ ] **Step 2: Add harga_slot to HargaModal form state**

In `HargaModal`, replace `useState` for `form`:

```typescript
const [form, setForm] = useState({
  kelas_id:   initialData ? String(initialData.kelas.id) : '',
  jenis:      initialData?.jenis ?? 'SAPI',
  harga_beli: initialData ? String(initialData.harga_beli) : '',
  harga_jual: initialData ? String(initialData.harga_jual) : '',
  harga_slot: initialData?.harga_slot != null ? String(initialData.harga_slot) : '',
  fee_sales:  initialData ? String(initialData.fee_sales) : '0',
})
```

- [ ] **Step 3: Add harga_slot to submit payload**

In `submit()`, update both the `isEdit` PUT payload and the POST payload to include `harga_slot`:

In `api.put(...)`:
```typescript
await api.put(`/api/master/harga/${initialData!.id}`, {
  harga_beli: Number(form.harga_beli),
  harga_jual: Number(form.harga_jual),
  harga_slot: form.harga_slot !== '' ? Number(form.harga_slot) : null,
  fee_sales:  Number(form.fee_sales),
})
```

In `api.post(...)`:
```typescript
await api.post('/api/master/harga', {
  depot_id:   Number(depotId),
  kelas_id:   Number(form.kelas_id),
  jenis:      form.jenis,
  musim:      Number(musim),
  harga_beli: Number(form.harga_beli),
  harga_jual: Number(form.harga_jual),
  harga_slot: form.harga_slot !== '' ? Number(form.harga_slot) : null,
  fee_sales:  Number(form.fee_sales),
})
```

- [ ] **Step 4: Add harga_slot input field in HargaModal form**

After the "Harga Jual" input div, add:

```tsx
<div>
  <label className="block text-xs font-body font-medium text-on-surface mb-1">
    Harga Slot 1/7 (Rp) <span className="text-on-surface-variant font-normal">— opsional, hanya SAPI</span>
  </label>
  <Input type="number" value={form.harga_slot} onChange={e => set('harga_slot', e.target.value)} placeholder="900000" />
</div>
```

- [ ] **Step 5: Add Harga Slot column to table**

In the table `thead`, add `'Harga Slot'` to the headers array:

```typescript
{['Kelas','Jenis','Harga Beli','Harga Jual','Harga Slot','Fee Sales','Aksi'].map(h => (
```

In the table `tbody` rows, add a cell after `harga_jual`:

```tsx
<td className="py-2.5 pr-4 font-body text-on-surface">
  {h.harga_slot != null ? fmt(h.harga_slot) : <span className="text-on-surface-variant text-xs italic">—</span>}
</td>
```

- [ ] **Step 6: TypeScript check**

```bash
cd C:/Users/USER/projects/simhq/frontend
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
cd C:/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/admin/master-data/TabHarga.tsx"
git commit -m "feat(master-harga): add harga_slot field to TabHarga"
```

---

## Task 6: Frontend — TipeQurbanModal + HewanBrowser

### Files
- Modify: `frontend/app/(dashboard)/depot/pos/page.tsx`       ← CartItem interface only
- Modify: `frontend/app/(dashboard)/depot/pos/TipeQurbanModal.tsx`
- Modify: `frontend/app/(dashboard)/depot/pos/HewanBrowser.tsx`

- [ ] **Step 0: Extend CartItem interface in page.tsx first (required for TypeScript)**

Open `frontend/app/(dashboard)/depot/pos/page.tsx`. Replace `CartItem` interface:

```typescript
export interface CartItem {
  tempId: string
  hewanId: number | null
  noHewan: string | null
  jenis: string
  kelasId: number
  kelasKode: string
  tipeQurban: string
  satuan: 'EKOR' | 'SLOT'
  namaQurban: string
  harga: number
  isPreorder: boolean
}
```

- [ ] **Step 1: Update TipeQurbanModal props + state**

Open `frontend/app/(dashboard)/depot/pos/TipeQurbanModal.tsx`.

Replace the `Props` interface:

```typescript
interface Props {
  hewan: HewanForCart
  harga: number
  hargaSlot: number | null
  slotTerisi: number
  onConfirm: (data: { tipeQurban: string; satuan: 'EKOR' | 'SLOT'; namaQurban: string; harga: number }) => void
  onClose: () => void
}
```

Replace the function signature and add new state:

```typescript
export function TipeQurbanModal({ hewan, harga, hargaSlot, slotTerisi, onConfirm, onClose }: Props) {
  const [tipe,       setTipe]       = useState('SHQ')
  const [satuan,     setSatuan]     = useState<'EKOR' | 'SLOT'>('EKOR')
  const [namaQurban, setNamaQurban] = useState('')
```

- [ ] **Step 2: Compute effective price and slot availability**

Add after state declarations:

```typescript
const slotTersisa    = 7 - slotTerisi
const slotPenuh      = slotTersisa <= 0
const hargaEfektif   = satuan === 'SLOT' ? (hargaSlot ?? 0) : harga
const namaQurbanWajib = satuan === 'SLOT' && tipe === 'PHQ'
const canAdd         = satuan === 'EKOR'
  ? true
  : hargaSlot != null && !slotPenuh
```

- [ ] **Step 3: Update onConfirm handler**

Replace the "Tambah ke Cart" button `onClick`:

```typescript
onClick={() => onConfirm({ tipeQurban: tipe, satuan, namaQurban, harga: hargaEfektif })}
```

And add `disabled` condition:

```typescript
disabled={!canAdd || (namaQurbanWajib && !namaQurban.trim())}
```

- [ ] **Step 4: Update modal UI**

Replace the full modal JSX body inside `TipeQurbanModal`. The new body:

```tsx
<div className="bg-surface-lowest rounded-2xl shadow-xl w-full max-w-sm p-6">
  <h2 className="font-display font-bold text-lg text-on-surface mb-1">
    Hewan #{hewan.no_hewan}
  </h2>
  <p className="text-sm text-on-surface-variant mb-4 font-body">
    {hewan.jenis} · {hewan.kelas_jual?.kode ?? '—'} · {hewan.bobot_masuk} kg
  </p>

  {/* Satuan toggle */}
  <div className="mb-4">
    <label className="block text-xs font-body font-medium text-on-surface mb-2">Satuan</label>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setSatuan('EKOR')}
        className={`flex-1 py-2 rounded-xl border-2 text-sm font-body transition-colors ${
          satuan === 'EKOR' ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
        }`}
      >
        1 Ekor
        {harga > 0 && <span className="block text-xs font-normal opacity-80">{harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}</span>}
      </button>
      <button
        type="button"
        onClick={() => !slotPenuh && hargaSlot != null && setSatuan('SLOT')}
        disabled={slotPenuh || hargaSlot == null}
        className={`flex-1 py-2 rounded-xl border-2 text-sm font-body transition-colors ${
          satuan === 'SLOT' ? 'border-primary bg-primary text-white'
          : slotPenuh || hargaSlot == null ? 'border-surface-high text-on-surface-variant opacity-50 cursor-not-allowed'
          : 'border-surface-high text-on-surface'
        }`}
      >
        1/7 Slot
        {hargaSlot != null
          ? <span className="block text-xs font-normal opacity-80">{hargaSlot.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}</span>
          : <span className="block text-xs font-normal opacity-70">Harga belum diset</span>}
      </button>
    </div>
    {satuan === 'SLOT' && !slotPenuh && (
      <p className="text-xs text-on-surface-variant mt-1 font-body">Tersisa {slotTersisa} slot</p>
    )}
    {slotPenuh && (
      <p className="text-xs text-red-600 mt-1 font-body">Semua slot penuh</p>
    )}
  </div>

  {/* Tipe qurban */}
  <div className="space-y-2 mb-4">
    <label className="block text-xs font-body font-medium text-on-surface">Tipe Qurban</label>
    {TIPE_OPTIONS.map(t => (
      <label
        key={t.value}
        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
          tipe === t.value ? 'border-primary bg-surface-high' : 'border-surface-high'
        }`}
      >
        <input
          type="radio"
          name="tipe"
          value={t.value}
          checked={tipe === t.value}
          onChange={() => setTipe(t.value)}
          className="accent-primary"
        />
        <span className="text-sm font-body text-on-surface">{t.label}</span>
      </label>
    ))}
  </div>

  {/* Nama qurban — only for SLOT + PHQ */}
  {satuan === 'SLOT' && tipe === 'PHQ' && (
    <div className="mb-4">
      <label className="block text-xs font-body font-medium text-on-surface mb-1">Nama Qurban (bin/binti) *</label>
      <input
        type="text"
        value={namaQurban}
        onChange={e => setNamaQurban(e.target.value)}
        placeholder="Ahmad bin Budi..."
        className="input-field w-full"
      />
    </div>
  )}
  {satuan === 'SLOT' && tipe !== 'PHQ' && (
    <div className="mb-4">
      <label className="block text-xs font-body font-medium text-on-surface mb-1">Nama Qurban (bin/binti)</label>
      <input
        type="text"
        value={namaQurban}
        onChange={e => setNamaQurban(e.target.value)}
        placeholder="Ahmad bin Budi... (opsional)"
        className="input-field w-full"
      />
    </div>
  )}

  <div className="flex gap-3 justify-end mt-2">
    <button
      type="button"
      onClick={onClose}
      className="px-4 py-2 rounded-xl text-sm font-body font-medium text-on-surface-variant hover:bg-surface-high transition-colors"
    >
      Batal
    </button>
    <button
      type="button"
      onClick={() => canAdd && !(namaQurbanWajib && !namaQurban.trim()) && onConfirm({ tipeQurban: tipe, satuan, namaQurban, harga: hargaEfektif })}
      disabled={!canAdd || (namaQurbanWajib && !namaQurban.trim())}
      className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
    >
      Tambah ke Cart
    </button>
  </div>
</div>
```

- [ ] **Step 5: Update HewanBrowser — HargaEntry + HewanForCart interfaces**

Open `frontend/app/(dashboard)/depot/pos/HewanBrowser.tsx`.

Replace `HargaEntry` interface:

```typescript
interface HargaEntry  { kelas_id: number; jenis: string; harga_jual: number; harga_slot: number | null }
```

Replace `HewanForCart` interface (in `TipeQurbanModal.tsx`, it's imported from there — check the import):

Actually `HewanForCart` is defined in `TipeQurbanModal.tsx` and imported in `HewanBrowser.tsx`. Open `TipeQurbanModal.tsx` and update:

```typescript
export interface HewanForCart {
  id: number
  no_hewan: string
  jenis: string
  kelas_jual: { id: number; kode: string } | null
  bobot_masuk: string
  slot_sapi_count: number
}
```

- [ ] **Step 6: Update HewanBrowser helper functions and card**

In `HewanBrowser.tsx`, add a `getHargaSlot` helper after `getHarga`:

```typescript
function getHargaSlot(kelasId: number, j: string): number | null {
  const entry = hargaList.find(h => h.kelas_id === kelasId && h.jenis === j)
  return entry?.harga_slot ?? null
}
```

Update the card to show slot badge for SAPI:

```tsx
{/* In the hewan card, after the price line: */}
{h.jenis === 'SAPI' && (
  <p className={`text-xs mt-0.5 font-body ${h.slot_sapi_count >= 7 ? 'text-red-500' : 'text-on-surface-variant'}`}>
    {h.slot_sapi_count}/7 slot
  </p>
)}
```

- [ ] **Step 7: Update handleHewanConfirm in HewanBrowser**

Replace `handleHewanConfirm`:

```typescript
function handleHewanConfirm(data: { tipeQurban: string; satuan: 'EKOR' | 'SLOT'; namaQurban: string; harga: number }) {
  if (!selected || !selected.kelas_jual) return
  onAdd({
    tempId:     crypto.randomUUID(),
    hewanId:    selected.id,
    noHewan:    selected.no_hewan,
    jenis:      selected.jenis,
    kelasId:    selected.kelas_jual.id,
    kelasKode:  selected.kelas_jual.kode,
    tipeQurban: data.tipeQurban,
    satuan:     data.satuan,
    namaQurban: data.namaQurban,
    harga:      data.harga,
    isPreorder: false,
  })
  setSelected(null)
}
```

- [ ] **Step 8: Update TipeQurbanModal call in HewanBrowser**

Replace the `<TipeQurbanModal>` usage:

```tsx
{selected && (
  <TipeQurbanModal
    hewan={selected}
    harga={selected.kelas_jual ? getHarga(selected.kelas_jual.id, selected.jenis) : 0}
    hargaSlot={selected.kelas_jual ? getHargaSlot(selected.kelas_jual.id, selected.jenis) : null}
    slotTerisi={selected.slot_sapi_count ?? 0}
    onConfirm={handleHewanConfirm}
    onClose={() => setSelected(null)}
  />
)}
```

- [ ] **Step 9: TypeScript check**

```bash
cd C:/Users/USER/projects/simhq/frontend
npx tsc --noEmit
```

Expected: 0 errors. Fix any type errors before committing.

- [ ] **Step 10: Commit**

```bash
cd C:/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/depot/pos/TipeQurbanModal.tsx" \
        "frontend/app/(dashboard)/depot/pos/HewanBrowser.tsx"
git commit -m "feat(pos-slot): TipeQurbanModal satuan toggle + slot badge in HewanBrowser"
```

---

## Task 7: Frontend — CartItem + page.tsx + CartPanel + PreorderModal

### Files
- Modify: `frontend/app/(dashboard)/depot/pos/page.tsx`
- Modify: `frontend/app/(dashboard)/depot/pos/CartPanel.tsx`
- Modify: `frontend/app/(dashboard)/depot/pos/PreorderModal.tsx`

- [ ] **Step 1: Update items mapping in handleSubmit**

In `handleSubmit`, update the `items` mapping:

```typescript
items: cart.map(item => ({
  hewan_id:    item.hewanId,
  jenis:       item.jenis,
  kelas_id:    item.kelasId,
  tipe_qurban: item.tipeQurban,
  harga:       item.harga,
  is_preorder: item.isPreorder,
  satuan:      item.satuan,
  nama_qurban: item.namaQurban || null,
})),
```

- [ ] **Step 2: Update PreorderModal — add satuan toggle + namaQurban**

Open `frontend/app/(dashboard)/depot/pos/PreorderModal.tsx`. — add satuan toggle + namaQurban**

Open `frontend/app/(dashboard)/depot/pos/PreorderModal.tsx`.

Add to imports — `useState` is already imported. No new imports needed.

Add state inside `PreorderModal`:

```typescript
const [satuan,     setSatuan]     = useState<'EKOR' | 'SLOT'>('EKOR')
const [namaQurban, setNamaQurban] = useState('')
```

Update `handleConfirm`:

```typescript
function handleConfirm() {
  if (!kelasId) return
  const kelas    = kelasList.find(k => k.id === kelasId)!
  const h        = hargaList.find(h => h.kelas_id === kelasId && h.jenis === jenis)
  const hargaEfektif = satuan === 'SLOT' ? ((h as any)?.harga_slot ?? 0) : getHarga()
  onConfirm({ jenis, kelasId, kelasKode: kelas.kode, tipeQurban: tipe, satuan, namaQurban, harga: hargaEfektif })
}
```

Update `onConfirm` prop type in Props:

```typescript
onConfirm: (item: { jenis: string; kelasId: number; kelasKode: string; tipeQurban: string; satuan: 'EKOR' | 'SLOT'; namaQurban: string; harga: number }) => void
```

Add satuan toggle section in the modal JSX, after the tipe qurban section and before the price display:

```tsx
<div>
  <label className="block text-sm font-body font-medium text-on-surface mb-1">Satuan</label>
  <div className="flex gap-2">
    {(['EKOR', 'SLOT'] as const).map(s => (
      <button
        key={s}
        type="button"
        onClick={() => setSatuan(s)}
        className={`flex-1 py-1.5 rounded-lg border-2 text-sm font-body transition-colors ${
          satuan === s ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
        }`}
      >
        {s === 'EKOR' ? '1 Ekor' : '1/7 Slot'}
      </button>
    ))}
  </div>
</div>

{satuan === 'SLOT' && tipe === 'PHQ' && (
  <div>
    <label className="block text-sm font-body font-medium text-on-surface mb-1">Nama Qurban *</label>
    <input
      type="text"
      value={namaQurban}
      onChange={e => setNamaQurban(e.target.value)}
      placeholder="Ahmad bin Budi..."
      className="input-field w-full"
    />
  </div>
)}
```

Update the Tambah button `disabled` condition:

```typescript
disabled={!kelasId || (satuan === 'SLOT' && tipe === 'PHQ' && !namaQurban.trim())}
```

- [ ] **Step 3: Update handlePreorderConfirm in HewanBrowser**

Open `HewanBrowser.tsx`. Replace `handlePreorderConfirm`:

```typescript
function handlePreorderConfirm(item: { jenis: string; kelasId: number; kelasKode: string; tipeQurban: string; satuan: 'EKOR' | 'SLOT'; namaQurban: string; harga: number }) {
  onAdd({
    tempId:     crypto.randomUUID(),
    hewanId:    null,
    noHewan:    null,
    jenis:      item.jenis,
    kelasId:    item.kelasId,
    kelasKode:  item.kelasKode,
    tipeQurban: item.tipeQurban,
    satuan:     item.satuan,
    namaQurban: item.namaQurban,
    harga:      item.harga,
    isPreorder: true,
  })
  setShowPreorder(false)
}
```

- [ ] **Step 4: Update CartPanel item display**

Open `frontend/app/(dashboard)/depot/pos/CartPanel.tsx`.

In the cart item row, update the item display line to include satuan and namaQurban:

```tsx
<p className="text-sm font-body font-medium text-on-surface">
  {item.isPreorder ? `Pre-order` : `#${item.noHewan}`}
  {' '}<span className="text-on-surface-variant font-normal">
    {item.jenis} {item.kelasKode} {item.tipeQurban}
    {item.satuan === 'SLOT' && ' · 1/7'}
    {item.namaQurban && <span className="italic"> · {item.namaQurban}</span>}
  </span>
</p>
```

- [ ] **Step 5: TypeScript check**

```bash
cd C:/Users/USER/projects/simhq/frontend
npx tsc --noEmit
```

Expected: 0 errors. Fix any errors before proceeding.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/USER/projects/simhq
git add "frontend/app/(dashboard)/depot/pos/page.tsx" \
        "frontend/app/(dashboard)/depot/pos/CartPanel.tsx" \
        "frontend/app/(dashboard)/depot/pos/PreorderModal.tsx" \
        "frontend/app/(dashboard)/depot/pos/HewanBrowser.tsx"
git commit -m "feat(pos-slot): CartItem satuan+namaQurban, PreorderModal satuan toggle, CartPanel display"
```

---

## Acceptance Criteria

- [ ] `harga_kelas` has `harga_slot` nullable column
- [ ] `transaksi_items` has `satuan` enum(EKOR/SLOT) + `nama_qurban` nullable
- [ ] TabHarga shows + accepts `harga_slot` in form and table
- [ ] Master harga API returns `harga_slot` in response
- [ ] POS TipeQurbanModal shows "1 Ekor / 1/7 Slot" toggle
- [ ] 1/7 Slot disabled when harga_slot not set or semua slot penuh
- [ ] HewanBrowser sapi card shows slot badge (X/7)
- [ ] Submit POS dengan satuan=SLOT → SlotSapi auto-created dengan no_slot berikutnya
- [ ] Submit POS dengan satuan=SLOT dan semua slot penuh → 422
- [ ] Submit POS dengan satuan=EKOR → no SlotSapi created
- [ ] `nama_qurban` wajib di form jika tipe PHQ + satuan SLOT
- [ ] Cart item tampilkan "1/7" dan nama_qurban jika ada
- [ ] Pre-order 1/7 slot bisa dibuat (tidak auto-create SlotSapi, link nanti dari ploting)
- [ ] Halaman ploting sinkron — sapi yang beli slot via POS tampil terisi
- [ ] Full backend test suite pass
- [ ] TypeScript: 0 errors
