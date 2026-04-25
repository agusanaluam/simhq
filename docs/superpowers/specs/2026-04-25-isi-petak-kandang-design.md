# Isi Petak Kandang — Design Spec

**Date:** 2026-04-25
**Status:** Approved
**Scope:** Add UI to assign unassigned animals (petak_id IS NULL) to a kandang petak via multi-select modal.

---

## Problem

Animals added via pengadaan have `petak_id = null`. There is no UI to assign them to a petak from the kandang page. The existing drag-and-drop only transfers animals already assigned to a petak.

---

## Solution

- Backend: add `?unassigned=1` filter to `GET /api/hewan`.
- Frontend: "Isi Petak" button in `HewanPanel` opens `IsiPetakModal`. User selects multiple animals (checkboxes), clicks assign. Each selected animal is assigned via existing `POST /api/hewan/{id}/transfer`.

---

## Architecture

### Data flow
`KandangPage` reads `depotId` + `musim` from session → passes as props to `HewanPanel` → `HewanPanel` passes to `IsiPetakModal` → modal fetches `GET /api/hewan?depot=&jenis=&musim=&unassigned=1`.

### Assign mechanic
`Promise.all` of N `POST /api/hewan/{id}/transfer { ke_petak_id }` calls. Existing endpoint handles initial assignment (dari_petak_id = null).

### Capacity guard
`sisaSlot = petak.kapasitas - petak.jumlah_terisi`. Checkboxes disabled when `selected.length >= sisaSlot` AND item not already selected. "Isi Petak" button only shown when `jumlah_terisi < kapasitas`.

---

## Backend

### HewanController::index()

Add one line after the existing kelas filter:

```php
->when($request->boolean('unassigned'), fn($q) => $q->whereNull('petak_id'))
```

No new files, no migration, no route changes.

---

## Frontend

### KandangPage — pass depotId + musim to HewanPanel

Read from session:
```tsx
const { data: session } = useSession()
const sessionDepotId = (session?.user as any)?.depotId as number | undefined
const musim = new Date().getFullYear()
```

Pass to `HewanPanel`:
```tsx
<HewanPanel
  petak={selectedPetak}
  depotId={sessionDepotId}
  musim={musim}
  onClose={() => setSelectedId(null)}
/>
```

### HewanPanel — add "Isi Petak" button + IsiPetakModal

New props: `depotId?: number`, `musim?: number`

Add state: `const [showIsi, setShowIsi] = useState(false)`

Add button below the animal list (only when not full):
```tsx
{petak.jumlah_terisi < petak.kapasitas && (
  <button
    onClick={() => setShowIsi(true)}
    className="mt-3 w-full text-sm font-body font-medium text-primary border border-primary rounded-xl py-1.5 hover:bg-primary/5 transition-colors"
  >
    + Isi Petak
  </button>
)}
```

Render modal:
```tsx
{showIsi && depotId && (
  <IsiPetakModal
    petak={petak}
    depotId={depotId}
    musim={musim ?? new Date().getFullYear()}
    onClose={() => setShowIsi(false)}
    onSuccess={() => { setShowIsi(false); /* parent refreshes via onClose chain */ }}
  />
)}
```

Note: `onSuccess` needs to trigger grid refresh. Pass `onRefresh` prop down from `KandangPage` → `HewanPanel` → called in `onSuccess`.

### New file: IsiPetakModal.tsx

Props:
```tsx
interface Props {
  petak: PetakData
  depotId: number
  musim: number
  onClose: () => void
  onSuccess: () => void
}
```

State:
- `hewan: HewanItem[]` — fetched unassigned list
- `selected: number[]` — array of hewan IDs
- `loading: boolean`
- `error: string`

Fetch on mount:
```tsx
api.get(`/api/hewan?depot=${depotId}&jenis=${petak.jenis_kandang}&musim=${musim}&unassigned=1&per_page=100`)
```

Note: paginated response — use `data` array from response.

Layout:
```
┌─────────────────────────────────────┐
│ Isi Petak {no_petak}                 │
│ {jumlah_terisi}/{kapasitas} terisi   │
│                                     │
│ ☐ 601 — A1 — 285 kg                │
│ ☑ 602 — A2 — 310 kg                │
│ ☑ 603 — A1 — 290 kg                │
│                                     │
│ Dipilih: 2 / maks {sisaSlot}        │
│                                     │
│ [Batal]        [Assign 2 Ekor]      │
└─────────────────────────────────────┘
```

Capacity guard:
```tsx
const sisaSlot = petak.kapasitas - petak.jumlah_terisi
const isMaxed = selected.length >= sisaSlot
// Per checkbox:
disabled={isMaxed && !selected.includes(h.id)}
```

Submit:
```tsx
await Promise.all(
  selected.map(id => api.post(`/api/hewan/${id}/transfer`, { ke_petak_id: petak.id }))
)
onSuccess()
```

Error: single message below list if any transfer fails.

Empty state: "Semua hewan sudah dialokasikan ke petak." when `hewan.length === 0`.

### HewanPanel props update

Updated interface:
```tsx
interface Props {
  petak: PetakData | null
  depotId?: number
  musim?: number
  onClose: () => void
  onRefresh: () => void
}
```

### KandangPage — pass onRefresh to HewanPanel

```tsx
<HewanPanel
  petak={selectedPetak}
  depotId={sessionDepotId}
  musim={musim}
  onClose={() => setSelectedId(null)}
  onRefresh={loadPetak}
/>
```

---

## Testing

Backend: add 2 tests to existing `HewanRegistrasiTest` or a new file:
1. `GET /api/hewan?unassigned=1` returns only animals with `petak_id IS NULL`
2. `GET /api/hewan?unassigned=1` excludes animals that have a petak assigned

Frontend: manual smoke test:
1. Add animals via pengadaan (no petak)
2. Open kandang page, click a petak
3. Click "Isi Petak" → modal shows unassigned animals of matching jenis
4. Select 2, click Assign → animals appear in petak grid
5. Verify capacity guard: cannot select more than `sisaSlot`

---

## Out of Scope

- Remove animal from petak via this modal (use drag to another petak)
- Filter unassigned list by kelas or bobot
- Pagination in modal (100 per page cap is sufficient)
