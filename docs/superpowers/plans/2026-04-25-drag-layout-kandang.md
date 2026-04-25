# Drag Layout Kandang Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-to-reposition layout mode to KandangGrid — staff drags petak cards to new positions, then saves all positions at once via "Simpan Layout".

**Architecture:** `KandangPage` gains `layoutMode` + `localPetak` state. `KandangGrid` receives `layoutMode`/`localPetak`/`onLayoutChange` props — in layout mode renders `DraggablePetakWrapper` + `DroppableCell` instead of normal hewan-drag mode. Drop logic swaps positions when cell occupied, moves when empty. Save calls existing `POST /api/petak/layout`.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, `@dnd-kit/core` (already installed).

---

## File Map

| Action | File |
|--------|------|
| Modify | `frontend/app/(dashboard)/depot/kandang/PetakCard.tsx` |
| Modify | `frontend/app/(dashboard)/depot/kandang/KandangGrid.tsx` |
| Modify | `frontend/app/(dashboard)/depot/kandang/page.tsx` |

---

## Task 1: PetakCard — add showHewan prop

**Files:**
- Modify: `frontend/app/(dashboard)/depot/kandang/PetakCard.tsx`

- [ ] **Step 1: Add showHewan prop to PetakCard**

Current `Props` interface:
```tsx
interface Props {
  petak: PetakData
  selected: boolean
  onClick: () => void
  isDragOver?: boolean
}
```

Replace with:
```tsx
interface Props {
  petak: PetakData
  selected: boolean
  onClick: () => void
  isDragOver?: boolean
  showHewan?: boolean
}
```

Current function signature:
```tsx
export function PetakCard({ petak, selected, onClick, isDragOver }: Props) {
```

Replace with:
```tsx
export function PetakCard({ petak, selected, onClick, isDragOver, showHewan = true }: Props) {
```

Find the hewan chips section:
```tsx
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
```

Replace with:
```tsx
      {showHewan && (
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
      )}
```

- [ ] **Step 2: Commit**

```bash
git -C C:/Users/USER/projects/simhq add "frontend/app/(dashboard)/depot/kandang/PetakCard.tsx"
git -C C:/Users/USER/projects/simhq commit -m "feat(kandang): add showHewan prop to PetakCard"
```

---

## Task 2: KandangGrid — layout mode

**Files:**
- Modify: `frontend/app/(dashboard)/depot/kandang/KandangGrid.tsx`

- [ ] **Step 1: Replace entire KandangGrid.tsx**

Replace the entire content of `frontend/app/(dashboard)/depot/kandang/KandangGrid.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay,
  useDraggable, useDroppable, type DragStartEvent
} from '@dnd-kit/core'
import { PetakCard, type PetakData } from './PetakCard'
import api from '@/lib/api'

// Normal mode: droppable petak (hewan transfer target)
function DroppablePetak({
  petak, selected, onClick, isDragOver
}: {
  petak: PetakData; selected: boolean; onClick: () => void; isDragOver: boolean
}) {
  const { setNodeRef } = useDroppable({ id: `petak-${petak.id}` })
  return (
    <div ref={setNodeRef}>
      <PetakCard petak={petak} selected={selected} onClick={onClick} isDragOver={isDragOver} />
    </div>
  )
}

// Normal mode: draggable hewan chip
function DraggableChip({ hewanId, noHewan }: { hewanId: number; noHewan: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hewan-${hewanId}`,
  })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <span
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-body border bg-surface-lowest border-surface-high cursor-grab select-none ${isDragging ? 'opacity-40' : ''}`}
    >
      {noHewan}
    </span>
  )
}

// Layout mode: draggable petak card
function DraggablePetakWrapper({
  petak, selected, onClick
}: {
  petak: PetakData; selected: boolean; onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `layout-petak-${petak.id}`,
  })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50, position: 'relative' as const }
    : undefined

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
         className={isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'}>
      <PetakCard petak={petak} selected={selected} onClick={onClick} showHewan={false} />
    </div>
  )
}

// Layout mode: droppable grid cell
function DroppableCell({ x, y, children }: { x: number; y: number; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${x}-${y}` })
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] rounded-lg transition-colors ${
        isOver ? 'bg-primary/10 border-2 border-primary border-dashed' : ''
      }`}
    >
      {children}
    </div>
  )
}

interface Props {
  petak: PetakData[]
  layoutMode: boolean
  localPetak: PetakData[]
  onLayoutChange: (updated: PetakData[]) => void
  selectedId: number | null
  onSelect: (id: number) => void
  onRefresh: () => void
}

export function KandangGrid({
  petak, layoutMode, localPetak, onLayoutChange,
  selectedId, onSelect, onRefresh
}: Props) {
  const [overId, setOverId]           = useState<string | null>(null)
  const [activeHewan, setActiveHewan] = useState<{ id: number; noHewan: string } | null>(null)

  const displayPetak = layoutMode ? localPetak : petak

  if (displayPetak.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-on-surface-variant text-sm bg-surface-lowest rounded-lg border-2 border-dashed border-surface-high">
        Belum ada petak kandang.
      </div>
    )
  }

  const maxX = Math.max(...displayPetak.map(p => p.posisi_x), 0)
  const maxY = Math.max(...displayPetak.map(p => p.posisi_y), 0)
  const cols = layoutMode ? maxX + 3 : maxX + 1
  const rows = layoutMode ? maxY + 3 : maxY + 1

  const petakMap: Record<string, PetakData> = {}
  displayPetak.forEach(p => { petakMap[`${p.posisi_x}-${p.posisi_y}`] = p })

  function handleDragStart(event: DragStartEvent) {
    if (layoutMode) return
    const hewanId = parseInt(String(event.active.id).replace('hewan-', ''))
    const h = petak.flatMap(p => p.hewan).find(h => h.id === hewanId)
    if (h) setActiveHewan({ id: h.id, noHewan: h.no_hewan })
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveHewan(null)
    setOverId(null)
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId   = String(over.id)

    // Layout mode: move/swap petak
    if (activeId.startsWith('layout-petak-') && overId.startsWith('cell-')) {
      const petakId  = parseInt(activeId.replace('layout-petak-', ''))
      const [tx, ty] = overId.replace('cell-', '').split('-').map(Number)
      const dragged  = localPetak.find(p => p.id === petakId)
      if (!dragged) return
      const occupant = localPetak.find(p => p.posisi_x === tx && p.posisi_y === ty && p.id !== petakId)

      const updated = localPetak.map(p => {
        if (p.id === petakId)                 return { ...p, posisi_x: tx, posisi_y: ty }
        if (occupant && p.id === occupant.id) return { ...p, posisi_x: dragged.posisi_x, posisi_y: dragged.posisi_y }
        return p
      })
      onLayoutChange(updated)
      return
    }

    // Normal mode: transfer hewan
    if (activeId.startsWith('hewan-') && overId.startsWith('petak-')) {
      const hewanId = parseInt(activeId.replace('hewan-', ''))
      const petakId = parseInt(overId.replace('petak-', ''))
      if (isNaN(hewanId) || isNaN(petakId)) return
      try {
        await api.post(`/api/hewan/${hewanId}/transfer`, { ke_petak_id: petakId })
        onRefresh()
      } catch (e) {
        console.error('Transfer gagal', e)
      }
    }
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {layoutMode && (
        <p className="text-xs text-on-surface-variant mb-3 font-body italic">
          Drag petak ke posisi baru. Klik "Simpan Layout" untuk menyimpan.
        </p>
      )}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(130px, 1fr))` }}
      >
        {Array.from({ length: rows }).flatMap((_, y) =>
          Array.from({ length: cols }).map((_, x) => {
            const p = petakMap[`${x}-${y}`]

            if (layoutMode) {
              return (
                <DroppableCell key={`cell-${x}-${y}`} x={x} y={y}>
                  {p && (
                    <DraggablePetakWrapper
                      petak={p}
                      selected={selectedId === p.id}
                      onClick={() => onSelect(p.id)}
                    />
                  )}
                </DroppableCell>
              )
            }

            if (!p) return <div key={`empty-${x}-${y}`} className="min-h-[80px]" />

            return (
              <DroppablePetak
                key={p.id}
                petak={p}
                selected={selectedId === p.id}
                onClick={() => onSelect(p.id)}
                isDragOver={overId === `petak-${p.id}`}
              />
            )
          })
        )}
      </div>

      <DragOverlay>
        {activeHewan && (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-body bg-accent text-on-accent shadow-card border border-accent-dim">
            {activeHewan.noHewan}
          </span>
        )}
      </DragOverlay>
    </DndContext>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C C:/Users/USER/projects/simhq add "frontend/app/(dashboard)/depot/kandang/KandangGrid.tsx"
git -C C:/Users/USER/projects/simhq commit -m "feat(kandang): add layout mode to KandangGrid with drag-to-reposition"
```

---

## Task 3: KandangPage — layout state + buttons

**Files:**
- Modify: `frontend/app/(dashboard)/depot/kandang/page.tsx`

- [ ] **Step 1: Add layout state variables**

Inside `KandangPage()`, after the existing state declarations, add:

```tsx
  const [layoutMode, setLayoutMode]     = useState(false)
  const [localPetak, setLocalPetak]     = useState<PetakData[]>([])
  const [savingLayout, setSavingLayout] = useState(false)
```

- [ ] **Step 2: Add layout functions**

After the `selectedPetak` declaration, add:

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

- [ ] **Step 3: Replace button area**

Find:
```tsx
          <button
            onClick={() => setShowTambah(true)}
            className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            + Tambah Petak
          </button>
```

Replace with:
```tsx
          {layoutMode ? (
            <>
              <button
                onClick={cancelLayout}
                className="px-4 py-2 rounded-xl text-sm font-body font-medium text-on-surface-variant border border-surface-high hover:bg-surface-high transition-colors"
              >
                Batal
              </button>
              <button
                onClick={saveLayout}
                disabled={savingLayout}
                className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {savingLayout ? 'Menyimpan...' : 'Simpan Layout'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startLayout}
                className="px-4 py-2 rounded-xl text-sm font-body font-medium text-on-surface border border-surface-high hover:bg-surface-high transition-colors"
              >
                Edit Layout
              </button>
              <button
                onClick={() => setShowTambah(true)}
                className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                + Tambah Petak
              </button>
            </>
          )}
```

- [ ] **Step 4: Update KandangGrid call — add new props**

Find:
```tsx
            <KandangGrid
              petak={petak}
              selectedId={selectedId}
              onSelect={id => setSelectedId(prev => prev === id ? null : id)}
              onRefresh={loadPetak}
            />
```

Replace with:
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

- [ ] **Step 5: Hide HewanPanel in layout mode**

Find:
```tsx
        <HewanPanel
          petak={selectedPetak}
          musim={musim}
          onClose={() => setSelectedId(null)}
          onRefresh={loadPetak}
        />
```

Replace with:
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

- [ ] **Step 6: Commit**

```bash
git -C C:/Users/USER/projects/simhq add "frontend/app/(dashboard)/depot/kandang/page.tsx"
git -C C:/Users/USER/projects/simhq commit -m "feat(kandang): add Edit Layout mode with Simpan/Batal to KandangPage"
```

---

## Task 4: Smoke Test

- [ ] **Step 1: Start dev server**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Test move to empty cell**

1. Open `/depot/kandang`
2. Click "Edit Layout" — button changes to "Simpan Layout" + "Batal", HewanPanel hidden, hewan chips hidden
3. Drag a petak to an empty cell — petak moves, source cell becomes empty, blue dashed highlight shows on hover

- [ ] **Step 3: Test swap**

4. Drag a petak onto another petak — they swap positions

- [ ] **Step 4: Test Batal**

5. Click "Batal" — all positions revert to original (no API call made)

- [ ] **Step 5: Test Simpan Layout**

6. Drag a petak, then click "Simpan Layout" — button shows "Menyimpan...", then grid refreshes with saved positions
7. Reload page — layout persists

- [ ] **Step 6: Verify normal mode unchanged**

8. Click out of layout mode — hewan chips reappear, normal HewanPanel works, jenis toggle works
