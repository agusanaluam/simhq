'use client'

import { Card } from '@/components/ui/Card'

interface SlotEntry {
  no_slot: number
  status?: 'KOSONG'
  nama_qurban?: string
  tipe_qurban?: string
  status_bayar?: string
  harga_slot?: number
  customer?: { nama: string; hp: string } | null
}

interface SapiData {
  id: number
  no_hewan: string
  status: string
  bobot_masuk: string
  kelas_jual?: { kode: string } | null
}

interface Props {
  sapi: SapiData
  slots: SlotEntry[]
  onAssign: (noSlot: number) => void
  onDelete: (noSlot: number) => void
  onClose: () => void
}

const BAYAR_COLOR: Record<string, string> = {
  LUNAS: 'text-green-700',
  DP:    'text-yellow-700',
}

export function SlotPanel({ sapi, slots, onAssign, onDelete, onClose }: Props) {
  const filled = slots.filter(s => s.status !== 'KOSONG')
  const totalTerkumpul = filled.reduce((sum, s) => sum + (s.harga_slot ?? 0), 0)

  return (
    <Card className="w-80 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display font-semibold text-on-surface">Sapi #{sapi.no_hewan}</h3>
          <p className="text-xs text-on-surface-variant font-body">
            {sapi.kelas_jual?.kode ?? '—'} · {sapi.bobot_masuk} kg · {filled.length}/7 slot
          </p>
        </div>
        <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
      </div>

      <div className="h-1.5 bg-surface-high rounded-full mb-4">
        <div
          className="h-1.5 rounded-full bg-primary transition-all"
          style={{ width: `${(filled.length / 7) * 100}%` }}
        />
      </div>

      {filled.length === 7 && (
        <div className="mb-3 px-3 py-1.5 bg-green-50 border border-green-300 rounded-xl text-xs font-body font-semibold text-green-800 text-center">
          PENUH
        </div>
      )}

      <p className="text-xs text-on-surface-variant font-body mb-3">
        Terkumpul: {totalTerkumpul.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
      </p>

      <div className="space-y-2">
        {Array.from({ length: 7 }, (_, i) => {
          const slot = slots.find(s => s.no_slot === i + 1)
          const isFilled = slot && slot.status !== 'KOSONG'

          return (
            <div key={i + 1} className="flex items-center justify-between py-2 border-b border-surface-high last:border-0">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-surface-high text-xs font-body font-semibold text-on-surface-variant flex items-center justify-center">
                  {i + 1}
                </span>
                {isFilled ? (
                  <div>
                    <p className="text-sm font-body font-medium text-on-surface">{slot?.customer?.nama}</p>
                    <p className="text-xs text-on-surface-variant">{slot?.nama_qurban} · {slot?.tipe_qurban}</p>
                    <p className={`text-xs font-body font-medium ${BAYAR_COLOR[slot?.status_bayar ?? 'DP']}`}>
                      {slot?.harga_slot?.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                      {' · '}{slot?.status_bayar === 'LUNAS' ? 'Lunas' : 'DP'}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-on-surface-variant italic">Kosong</span>
                )}
              </div>
              <div className="flex gap-1">
                {!isFilled && (
                  <button onClick={() => onAssign(i + 1)} className="text-xs text-primary hover:underline">
                    Isi
                  </button>
                )}
                {isFilled && (
                  <button onClick={() => onDelete(i + 1)} className="text-xs text-red-600 hover:underline">
                    Hapus
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
