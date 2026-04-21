'use client'

import { useState } from 'react'
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay,
  useDraggable, useDroppable, type DragStartEvent
} from '@dnd-kit/core'
import { PetakCard, type PetakData } from './PetakCard'
import api from '@/lib/api'

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

interface Props {
  petak: PetakData[]
  selectedId: number | null
  onSelect: (id: number) => void
  onRefresh: () => void
}

export function KandangGrid({ petak, selectedId, onSelect, onRefresh }: Props) {
  const [overId, setOverId]           = useState<string | null>(null)
  const [activeHewan, setActiveHewan] = useState<{ id: number; noHewan: string } | null>(null)

  if (petak.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-on-surface-variant text-sm bg-surface-lowest rounded-lg border-2 border-dashed border-surface-high">
        Belum ada petak kandang.
      </div>
    )
  }

  const maxX = Math.max(...petak.map(p => p.posisi_x), 0)
  const maxY = Math.max(...petak.map(p => p.posisi_y), 0)
  const cols = maxX + 1
  const rows = maxY + 1

  const petakMap: Record<string, PetakData> = {}
  petak.forEach(p => { petakMap[`${p.posisi_x}-${p.posisi_y}`] = p })

  function handleDragStart(event: DragStartEvent) {
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

    const hewanId = parseInt(String(active.id).replace('hewan-', ''))
    const petakId = parseInt(String(over.id).replace('petak-', ''))
    if (isNaN(hewanId) || isNaN(petakId)) return

    try {
      await api.post(`/api/hewan/${hewanId}/transfer`, { ke_petak_id: petakId })
      onRefresh()
    } catch (e) {
      console.error('Transfer gagal', e)
    }
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(130px, 1fr))` }}
      >
        {Array.from({ length: rows }).flatMap((_, y) =>
          Array.from({ length: cols }).map((_, x) => {
            const p = petakMap[`${x}-${y}`]
            if (!p) return <div key={`empty-${x}-${y}`} className="min-h-[80px]" />

            // Swap hewan chips with draggable versions
            const petakWithDraggable: PetakData = {
              ...p,
              hewan: p.hewan.map(h => ({
                ...h,
                // Override rendering via a hack — we render DraggableChip separately
              })),
            }

            return (
              <DroppablePetak
                key={p.id}
                petak={petakWithDraggable}
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
