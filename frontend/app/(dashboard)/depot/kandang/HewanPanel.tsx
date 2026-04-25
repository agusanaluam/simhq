'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { StatusChip } from '@/components/ui/StatusChip'
import Link from 'next/link'
import type { PetakData } from './PetakCard'
import { IsiPetakModal } from './IsiPetakModal'

const STATUS_CHIP: Record<string, 'TERSEDIA' | 'DIPESAN' | 'TERJUAL' | 'MATI'> = {
  AVAILABLE: 'TERSEDIA', BOOKED: 'DIPESAN',
  SOLD: 'TERJUAL', DELIVERED: 'TERJUAL', MATI: 'MATI',
}

interface Props {
  petak: PetakData | null
  musim?: number
  onClose: () => void
  onRefresh: () => void
}

export function HewanPanel({ petak, musim, onClose, onRefresh }: Props) {
  const [showIsi, setShowIsi] = useState(false)

  if (!petak) return null

  return (
    <Card className="w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-on-surface">Petak {petak.no_petak}</h3>
        <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface text-xl leading-none">&times;</button>
      </div>

      <p className="text-xs text-on-surface-variant mb-3 font-body">
        {petak.jenis_kandang} &middot; {petak.jumlah_terisi}/{petak.kapasitas} terisi
      </p>

      <div className="space-y-2">
        {petak.hewan.length === 0 && (
          <p className="text-sm text-on-surface-variant italic">Petak kosong</p>
        )}
        {petak.hewan.map(h => (
          <div key={h.id} className="flex items-center justify-between py-2 border-b border-surface-high last:border-0">
            <div>
              <p className="font-body font-medium text-on-surface text-sm">{h.no_hewan}</p>
              <p className="text-xs text-on-surface-variant">
                {h.jenis} &middot; {h.kelas_jual?.kode ?? '—'} &middot; {h.bobot_masuk} kg
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusChip status={STATUS_CHIP[h.status] ?? 'TERSEDIA'} />
              <Link href={`/depot/pengadaan/${h.id}`} className="text-xs text-primary hover:underline">Detail</Link>
            </div>
          </div>
        ))}
      </div>

      {petak.jumlah_terisi < petak.kapasitas && (
        <button
          onClick={() => setShowIsi(true)}
          className="mt-3 w-full text-sm font-body font-medium text-primary border border-primary rounded-xl py-1.5 hover:bg-primary/5 transition-colors"
        >
          + Isi Petak
        </button>
      )}

      {showIsi && (
        <IsiPetakModal
          petak={petak}
          musim={musim ?? new Date().getFullYear()}
          onClose={() => setShowIsi(false)}
          onSuccess={() => { setShowIsi(false); onRefresh() }}
        />
      )}
    </Card>
  )
}
