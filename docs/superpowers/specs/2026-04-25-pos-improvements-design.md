# POS Improvements — Design Spec

**Date:** 2026-04-25
**Status:** Approved
**Scope:** Fix kelas filter bug in step 2, improve address fields, redesign StepReview (CS filtered, Teller auto, Sales text, payment method + scheme).

---

## Problems

1. Step 2 shows all AVAILABLE hewan regardless of kelas selected in step 1.
2. Address form missing `kelurahan`, `kecamatan`, `kode_pos`.
3. StepReview CS/Teller/Sales dropdowns all show all karyawan — wrong. And no payment method/scheme capture.

---

## Solution Overview

- Backend: add `kode_pos` to customers, `sales_nama` + `rencana_pelunasan` to transaksi, role filter to UserController.
- `StepPilihHewan`: pass `kelasId` + add `&kelas=${kelasId}` to hewan API call.
- `StepDataPembeli`: add kelurahan, kecamatan, kode_pos fields.
- `StepReview`: CS = filtered dropdown (CS roles only), Teller = auto from session, Sales = text input, Payment = metode + tipe (DP/LUNAS) + nominal + rencana_pelunasan.
- POS submit: POST /api/transaksi → then POST /api/transaksi/{id}/bayar for initial payment.

---

## Backend

### Migrations

**1. customers — add kode_pos:**
```php
Schema::table('customers', function (Blueprint $table) {
    $table->string('kode_pos', 10)->nullable()->after('kota');
});
```

**2. transaksi — add sales_nama + rencana_pelunasan:**
```php
Schema::table('transaksi', function (Blueprint $table) {
    $table->string('sales_nama', 100)->nullable()->after('sales_id');
    $table->date('rencana_pelunasan')->nullable()->after('sales_nama');
});
```

### Model updates

**Customer** (`app/Models/Customer.php`) — add to fillable:
```php
'kode_pos'
```

**Transaksi** (`app/Models/Transaksi.php`) — add to fillable:
```php
'sales_nama', 'rencana_pelunasan'
```

Add cast: `'rencana_pelunasan' => 'date'`

### StoreTransaksiRequest — add new fields:
```php
'sales_nama'         => ['nullable', 'string', 'max:100'],
'rencana_pelunasan'  => ['nullable', 'date'],
```

### CustomerController (or existing create) — add kode_pos to validation:
Check `app/Http/Controllers/CrmController.php` or `CustomerController` for the store endpoint that `StepDataPembeli` calls (`POST /api/customer`). Add:
```php
'kode_pos' => ['nullable', 'string', 'max:10'],
```

### UserController::index() — add role filter:
```php
public function index(Request $request): JsonResponse
{
    $users = User::with('depot:id,nama')
        ->when($request->role, fn($q) => $q->whereIn('role', explode(',', $request->role)))
        ->orderBy('name')
        ->paginate(50);

    return response()->json($users);
}
```

This allows `GET /api/users?role=CS_KETUA,CS_ANGGOTA`.

---

## Frontend

### FormState (page.tsx) — add new fields:
```tsx
interface FormState {
  // existing...
  salesNama: string
  rencana_pelunasan: string    // date string YYYY-MM-DD, empty = LUNAS
  metodeBayar: string          // CASH | TRANSFER_BCA | TRANSFER_LAIN
  tipeBayar: string            // DP | PELUNASAN
  nominalBayar: number
  kecamatan: string
  kelurahan: string
  kode_pos: string
}
```

Add to INIT:
```tsx
salesNama: '', rencana_pelunasan: '', metodeBayar: 'CASH', tipeBayar: 'PELUNASAN', nominalBayar: 0,
kecamatan: '', kelurahan: '', kode_pos: '',
```

### page.tsx — pass kelasId to StepPilihHewan:
```tsx
{step === 1 && (
  <StepPilihHewan
    jenis={form.jenis}
    kelasId={form.kelasId}      // ← add this
    hewanId={form.hewanId}
    preorder={form.preorder}
    onNext={onStep2Done}
    onBack={() => setStep(0)}
  />
)}
```

### page.tsx — update onStep3Done for new address fields:
```tsx
function onStep3Done(data: { customerId: number; nama: string; hp: string; alamat: string; kecamatan: string; kelurahan: string; kode_pos: string; kota: string }) {
  setForm(f => ({
    ...f,
    customerId: data.customerId,
    namaPembeli: data.nama,
    hp: data.hp,
    alamat: data.alamat,
    kecamatan: data.kecamatan,
    kelurahan: data.kelurahan,
    kode_pos: data.kode_pos,
    kota: data.kota,
  }))
  setStep(3)
}
```

### page.tsx — update onStep4Done for split transaksi + pembayaran:
```tsx
async function onStep4Done(data: {
  csId: number | null
  tellerId: number | null
  salesNama: string
  rencana_pelunasan: string
  metodeBayar: string
  tipeBayar: string
  nominalBayar: number
}) {
  if (!depotId || !form.kelasId || !form.customerId) return
  setSubmitting(true)
  try {
    const res = await api.post('/api/transaksi', {
      depot_id:           depotId,
      hewan_id:           form.hewanId,
      customer_id:        form.customerId,
      cs_id:              data.csId,
      teller_id:          data.tellerId,
      sales_id:           null,
      sales_nama:         data.salesNama || null,
      rencana_pelunasan:  data.rencana_pelunasan || null,
      tipe_qurban:        form.tipeQurban,
      jenis:              form.jenis,
      kelas_id:           form.kelasId,
      musim:              MUSIM,
    })
    const transaksiId = res.data.transaksi.id

    await api.post(`/api/transaksi/${transaksiId}/bayar`, {
      jumlah:    data.nominalBayar,
      tipe:      data.tipeBayar,
      metode:    data.metodeBayar,
      teller_id: data.tellerId,
      tgl_bayar: new Date().toISOString().split('T')[0],
    })

    router.push('/depot/transaksi')
  } catch {
    setSubmitting(false)
  }
}
```

### StepPilihHewan — add kelasId prop + filter:

New Props:
```tsx
interface Props {
  jenis: string
  kelasId: number | null   // ← new
  hewanId: number | null
  preorder: boolean
  onNext: (data: { hewanId: number | null; preorder: boolean; hewanNo: string | null }) => void
  onBack: () => void
}
```

Update useEffect fetch:
```tsx
useEffect(() => {
  const params = new URLSearchParams({ status: 'AVAILABLE', jenis })
  if (kelasId) params.set('kelas', String(kelasId))
  api.get(`/api/hewan?${params}`)
    .then(r => setHewan(r.data.data ?? []))
    .finally(() => setLoading(false))
}, [jenis, kelasId])
```

### StepDataPembeli — add kelurahan, kecamatan, kode_pos:

Update Customer interface:
```tsx
interface Customer { id: number; nama: string; hp: string; alamat: string | null; kecamatan: string | null; kelurahan: string | null; kode_pos: string | null; kota: string | null }
```

Update PembeliData interface:
```tsx
interface PembeliData {
  customerId: number | null
  nama: string; hp: string; alamat: string
  kecamatan: string; kelurahan: string; kode_pos: string; kota: string
}
```

Update onNext signature accordingly.

Add state variables: `kecamatan`, `kelurahan`, `kode_pos`.

Update `selectCustomer`:
```tsx
function selectCustomer(c: Customer) {
  selectedCustomerId.current = c.id
  setNama(c.nama); setHp(c.hp ?? ''); setAlamat(c.alamat ?? '')
  setKecamatan(c.kecamatan ?? ''); setKelurahan(c.kelurahan ?? '')
  setKodPos(c.kode_pos ?? ''); setKota(c.kota ?? '')
  setSuggestions([]); setShowSug(false)
}
```

Update `handleNext`:
```tsx
const res = await api.post('/api/customer', { nama, hp, alamat, kecamatan, kelurahan, kode_pos, kota })
onNext({ customerId, nama, hp, alamat, kecamatan, kelurahan, kode_pos, kota })
```

Add 3 new Input fields after existing alamat + before kota:
```tsx
<Input label="Kelurahan" value={kelurahan} onChange={e => setKelurahan(e.target.value)} />
<Input label="Kecamatan" value={kecamatan} onChange={e => setKecamatan(e.target.value)} />
<Input label="Kode Pos"  value={kode_pos}  onChange={e => setKodPos(e.target.value)} placeholder="12345" />
```

### StepReview — full redesign:

**CS (filtered dropdown):**
```tsx
const [csUsers, setCsUsers] = useState<{id: number; name: string}[]>([])
useEffect(() => {
  api.get('/api/users?role=CS_KETUA,CS_ANGGOTA').then(r => setCsUsers(r.data.data ?? []))
}, [])
```
Render as `<select>` showing CS users only.

**Teller (auto from session):**
```tsx
const { data: session } = useSession()
const sessionUser = session?.user as any
const tellerId    = sessionUser?.id as number | undefined
const tellerName  = sessionUser?.name as string | undefined
```
Render as read-only text: `"Teller: {tellerName}"`. Pass `tellerId` to onSubmit.

**Sales (text input):**
```tsx
const [salesNama, setSalesNama] = useState('')
```
```tsx
<Input label="Sales" value={salesNama} onChange={e => setSalesNama(e.target.value)} placeholder="Nama sales..." />
```

**Payment section (new):**
```tsx
const [metode, setMetode]   = useState('CASH')
const [tipe, setTipe]       = useState('PELUNASAN')  // PELUNASAN or DP
const [nominal, setNominal] = useState(summary.harga)
const [rencana, setRencana] = useState('')
```

Payment UI in StepReview:
- Row 1 (Metode): 3 toggle buttons — CASH, Transfer BCA, Transfer Lain
- Row 2 (Skema): 2 toggle buttons — LUNAS, DP
- Row 3: Nominal input (number, default = `summary.harga`)
- Row 4 (conditional): if tipe=DP → date input "Rencana Pelunasan"

Updated onSubmit:
```tsx
onSubmit({ csId, tellerId, salesNama, rencana_pelunasan: rencana, metodeBayar: metode, tipeBayar: tipe, nominalBayar: nominal })
```

Updated Props.onSubmit signature:
```tsx
onSubmit: (data: {
  csId: number | null
  tellerId: number | null
  salesNama: string
  rencana_pelunasan: string
  metodeBayar: string
  tipeBayar: string
  nominalBayar: number
}) => void
```

---

## Testing

Backend: add to existing `HewanRegistrasiTest` or new test:
1. `GET /api/users?role=CS_KETUA,CS_ANGGOTA` — returns only CS users
2. `POST /api/transaksi` accepts `sales_nama` + `rencana_pelunasan`

Frontend: manual smoke test:
1. POS step 1: select SAPI kelas A2
2. Step 2: only A2 SAPI hewan shown
3. Step 3: fill address with kelurahan, kecamatan, kode_pos
4. Step 4 (review): Teller auto-filled from session; CS dropdown shows only CS users; Sales text; payment: metode TRANSFER, DP, nominal 1jt, rencana pelunasan 30 hari
5. Submit → transaksi created + pembayaran created → redirect

---

## Out of Scope

- Kode pos validation (not enforced server-side beyond max:10)
- Multiple payment records at transaction creation (only first payment)
- Changing teller assignment after creation
