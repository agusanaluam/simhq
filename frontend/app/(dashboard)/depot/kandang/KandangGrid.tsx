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
