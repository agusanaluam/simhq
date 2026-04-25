# Drag Layout Kandang — Design Spec

**Date:** 2026-04-25
**Status:** Approved
**Scope:** Add drag-to-reposition petak layout mode in KandangGrid. Staff drags petak cards to new grid cells, then saves all positions at once.

---

## Problem

Petak positions (`posisi_x`, `posisi_y`) can only be changed via API. No visual drag UI exists to rearrange the kandang grid layout.

---

## Solution

Add "Edit Layout" toggle. In layout mode, each petak card becomes draggable and each grid cell becomes a drop target. Positions update locally on drop (swap if occupied, move if empty). "Simpan Layout" saves all positions to backend via existing `POST /api/petak/layout`. "Batal" discards changes.

---

## Architecture

### State
- `KandangPage` holds `layoutMode: boolean` and `localPetak: PetakData[]` (editable copy of positions).
- `localPetak` is initialised from `petak` when entering layout mode.
- On each drop in layout mode, `KandangGrid` emits `onLayoutChange(updatedPetak[])` and `KandangPage` updates `localPetak`.
- "Simpan" sends `POST /api/petak/layout` then exits layout mode and refreshes.
- "Batal" just exits layout mode (discards `localPetak`).

### Drag IDs (layout mode)
- Draggable petak: `layout-petak-{id}`
- Droppable cell: `cell-{x}-{y}` (every cell in the extended grid, including empty ones)

### Drop logic
```
petakId = active.id → "layout-petak-{id}"
(tx, ty) = over.id  → "cell-{x}-{y}"

dragged  = localPetak.find(p.id === petakId)
occupant = localPetak.find(p.posisi_x === tx && p.posisi_y === ty)

result = localPetak.map:
  dragged  → posisi_x=tx, posisi_y=ty
  occupant → posisi_x=dragged.posisi_x, posisi_y=dragged.posisi_y (swap)
  others   → unchanged
```

### Grid size in layout mode
Render `maxX + 3` cols × `maxY + 3` rows — gives room to expand layout beyond current bounds.

---

## Backend

No changes. Existing `POST /api/petak/layout` accepts:
```json
{ "layout": [{ "id": 1, "posisi_x": 2, "posisi_y": 0 }, ...] }
```

---

## Frontend

### KandangGrid props (new)
```tsx
layoutMode: boolean
localPetak: PetakData[]
onLayoutChange: (updated: PetakData[]) => void
```

### KandangGrid — layout mode behaviour
- Renders from `layoutMode ? localPetak : petak`
- Each petak wrapped in `DraggablePetakWrapper` (id: `layout-petak-{petak.id}`)
- Each grid cell wrapped in `DroppableCell` (id: `cell-{x}-{y}`) — all cells including empty
- Hewan chips NOT rendered in layout mode (reduces visual clutter)
- Existing hewan drag (normal mode) unchanged
- `handleDragEnd` branches on active.id prefix:
  - `layout-petak-` → layout drop logic (swap/move)
  - `hewan-` → existing transfer logic

### DraggablePetakWrapper
```tsx
function DraggablePetakWrapper({ petak, selected, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `layout-petak-${petak.id}`,
  })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
         className={isDragging ? 'opacity-50' : ''}>
      <PetakCard petak={petak} selected={selected} onClick={onClick} showHewan={false} />
    </div>
  )
}
```

### PetakCard — showHewan prop
Add optional `showHewan?: boolean` prop (default `true`). When `false`, skip rendering hewan chips. Keeps PetakCard reusable.

### DroppableCell
```tsx
function DroppableCell({ x, y, children }: { x: number; y: number; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${x}-${y}` })
  return (
    <div ref={setNodeRef}
         className={`min-h-[80px] rounded-lg transition-colors ${isOver ? 'bg-primary/10 border-2 border-primary border-dashed' : ''}`}>
      {children}
    </div>
  )
}
```

### KandangPage changes

New state:
```tsx
const [layoutMode, setLayoutMode]   = useState(false)
const [localPetak, setLocalPetak]   = useState<PetakData[]>([])
const [savingLayout, setSavingLayout] = useState(false)
```

Functions:
```tsx
function startLayout() {
  setLocalPetak(petak)
  setLayoutMode(true)
  setSelectedId(null)
}

function cancelLayout() {
  setLayoutMode(false)
}

async function saveLayout() {
  setSavingLayout(true)
  try {
    await api.post('/api/petak/layout', {
      layout: localPetak.map(p => ({ id: p.id, posisi_x: p.posisi_x, posisi_y: p.posisi_y }))
    })
    setLayoutMode(false)
    loadPetak()
  } finally {
    setSavingLayout(false)
  }
}
```

Button area — replace existing "+ Tambah Petak" button area:
```tsx
{layoutMode ? (
  <>
    <button onClick={cancelLayout} className="... secondary ...">Batal</button>
    <button onClick={saveLayout} disabled={savingLayout} className="... primary ...">
      {savingLayout ? 'Menyimpan...' : 'Simpan Layout'}
    </button>
  </>
) : (
  <>
    <button onClick={startLayout} className="... secondary ...">Edit Layout</button>
    <button onClick={() => setShowTambah(true)} className="... primary ...">+ Tambah Petak</button>
  </>
)}
```

KandangGrid call — add new props:
```tsx
<KandangGrid
  petak={petak}
  layoutMode={layoutMode}
  localPetak={localPetak}
  onLayoutChange={setLocalPetak}
  selectedId={selectedId}
  onSelect={id => setSelectedId(prev => prev === id ? null : id)}
  onRefresh={loadPetak}
/>
```

HewanPanel hidden in layout mode:
```tsx
{!layoutMode && (
  <HewanPanel
    petak={selectedPetak}
    musim={musim}
    onClose={() => setSelectedId(null)}
    onRefresh={loadPetak}
  />
)}
```

---

## Testing

Manual smoke test:
1. Open `/depot/kandang`
2. Click "Edit Layout" — grid enters layout mode, HewanPanel hidden
3. Drag a petak to an empty cell — petak moves
4. Drag a petak onto another petak — they swap
5. Click "Batal" — positions reset to original
6. Repeat drag, click "Simpan Layout" — positions saved, grid refreshes with new layout

---

## Out of Scope

- Rotate petak (no field in schema)
- Undo/redo within layout mode
- Add/remove petaks in layout mode (use existing Tambah/update flow)
