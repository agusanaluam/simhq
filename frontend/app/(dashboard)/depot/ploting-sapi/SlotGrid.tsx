import { cn } from '@/lib/utils'

interface SlotEntry {
  no_slot: number
  status?: 'KOSONG'
  status_bayar?: string
  customer?: { nama: string; hp: string } | null
}

interface Props {
  slots: SlotEntry[]
  onSlotClick: (noSlot: number) => void
}

const BAYAR_COLOR: Record<string, string> = {
  LUNAS: 'bg-green-100 border-green-400',
  DP:    'bg-yellow-50 border-yellow-300',
}

export function SlotGrid({ slots, onSlotClick }: Props) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {Array.from({ length: 7 }, (_, i) => {
        const slot = slots.find(s => s.no_slot === i + 1)
        const filled = slot && slot.status !== 'KOSONG'

        return (
          <button
            key={i + 1}
            onClick={() => onSlotClick(i + 1)}
            title={filled ? `Slot ${i + 1}: ${slot?.customer?.nama ?? ''}` : `Slot ${i + 1}: Kosong`}
            className={cn(
              'h-5 rounded border-2 transition-all',
              filled
                ? (BAYAR_COLOR[slot?.status_bayar ?? 'DP'] ?? 'bg-blue-100 border-blue-300')
                : 'bg-surface-high border-surface-highest hover:border-primary/50'
            )}
          />
        )
      })}
    </div>
  )
}
