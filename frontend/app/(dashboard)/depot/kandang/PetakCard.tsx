import { cn } from '@/lib/utils'

export type HewanInPetak = {
  id: number; no_hewan: string; jenis: string; status: string
  bobot_masuk: string; kelas_jual: { kode: string } | null
}

export type PetakData = {
  id: number; depot_id: number; no_petak: string; jenis_kandang: string
  kapasitas: number; jumlah_terisi: number; posisi_x: number; posisi_y: number
  kelas: { kode: string } | null; hewan: HewanInPetak[]
}

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: 'bg-[#dcfce7] border-[#15803d]',
  BOOKED:    'bg-[#fef9c3] border-[#854d0e]',
  SOLD:      'bg-[#dbeef8] border-[#2779a7]',
}

interface Props {
  petak: PetakData
  selected: boolean
  onClick: () => void
  isDragOver?: boolean
}

export function PetakCard({ petak, selected, onClick, isDragOver }: Props) {
  const pct  = petak.kapasitas > 0 ? (petak.jumlah_terisi / petak.kapasitas) * 100 : 0
  const full = petak.jumlah_terisi >= petak.kapasitas

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border-2 p-2 cursor-pointer transition-all min-h-[80px]',
        selected   ? 'border-primary bg-surface-high shadow-card' : 'border-surface-high bg-surface-lowest',
        isDragOver ? 'border-accent bg-[#fef9c3]' : '',
        full       ? 'opacity-75' : ''
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-display font-bold text-sm text-on-surface">{petak.no_petak}</span>
        <span className={cn('text-xs font-body', full ? 'text-error' : 'text-on-surface-variant')}>
          {petak.jumlah_terisi}/{petak.kapasitas}
        </span>
      </div>

      <div className="h-1 bg-surface-high rounded-full mb-2">
        <div
          className={cn('h-1 rounded-full transition-all', full ? 'bg-error' : 'bg-primary')}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

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

      {petak.kelas && (
        <p className="text-xs text-on-surface-variant mt-1.5 font-body">Kelas {petak.kelas.kode}</p>
      )}
    </div>
  )
}
