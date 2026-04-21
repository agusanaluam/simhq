'use client'

import { useCallback, useEffect, useState } from 'react'
import { KandangGrid } from './KandangGrid'
import { HewanPanel } from './HewanPanel'
import type { PetakData } from './PetakCard'
import api from '@/lib/api'

export default function KandangPage() {
  const [petak, setPetak]           = useState<PetakData[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [jenis, setJenis]           = useState<'SAPI' | 'DOMBA'>('SAPI')
  const [loading, setLoading]       = useState(true)

  const loadPetak = useCallback(() => {
    setLoading(true)
    api.get(`/api/petak?jenis=${jenis}`)
      .then(r => setPetak(r.data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [jenis])

  useEffect(() => {
    loadPetak()
    const interval = setInterval(loadPetak, 30_000)
    return () => clearInterval(interval)
  }, [loadPetak])

  const selectedPetak = petak.find(p => p.id === selectedId) ?? null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Ploting Kandang</h1>
          <p className="text-sm text-on-surface-variant mt-1">Grid visual posisi hewan per petak</p>
        </div>

        <div className="flex bg-surface-high rounded-xl p-1 gap-1">
          {(['SAPI', 'DOMBA'] as const).map(j => (
            <button
              key={j}
              onClick={() => setJenis(j)}
              className={`px-4 py-1.5 rounded-lg text-sm font-body font-medium transition-colors ${
                jenis === j
                  ? 'bg-surface-lowest text-on-surface shadow-card'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {j === 'SAPI' ? 'Sapi' : 'Domba'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs font-body text-on-surface-variant flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#dcfce7] border border-[#15803d] inline-block" />
          Tersedia
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#fef9c3] border border-[#854d0e] inline-block" />
          Dipesan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#dbeef8] border border-[#2779a7] inline-block" />
          Terjual
        </span>
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          {loading ? (
            <p className="text-sm text-on-surface-variant py-8 text-center">Memuat kandang...</p>
          ) : (
            <KandangGrid
              petak={petak}
              selectedId={selectedId}
              onSelect={id => setSelectedId(prev => prev === id ? null : id)}
              onRefresh={loadPetak}
            />
          )}
        </div>

        <HewanPanel petak={selectedPetak} onClose={() => setSelectedId(null)} />
      </div>
    </div>
  )
}
