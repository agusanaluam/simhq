'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { KandangGrid } from './KandangGrid'
import { HewanPanel } from './HewanPanel'
import type { PetakData } from './PetakCard'
import api from '@/lib/api'

// ---------------------------------------------------------------------------
// TambahPetakModal
// ---------------------------------------------------------------------------
interface TambahPetakModalProps {
  defaultJenis: 'SAPI' | 'DOMBA'
  onClose: () => void
  onSuccess: () => void
}

function TambahPetakModal({ defaultJenis, onClose, onSuccess }: TambahPetakModalProps) {
  const { data: session } = useSession()
  const sessionDepotId = (session?.user as any)?.depotId as number | undefined

  const [depots,       setDepots]       = useState<{ id: number; nama: string }[]>([])
  const [selectedDepot,setSelectedDepot]= useState<string>(sessionDepotId ? String(sessionDepotId) : '')
  const [noPetak,      setNoPetak]      = useState('')
  const [jenis,        setJenis]        = useState<'SAPI' | 'DOMBA'>(defaultJenis)
  const [kapasitas,    setKapasitas]    = useState(5)
  const [posisiX,      setPosisiX]      = useState(0)
  const [posisiY,      setPosisiY]      = useState(0)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  useEffect(() => {
    if (!sessionDepotId) {
      api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
    }
  }, [sessionDepotId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const depotId = sessionDepotId ?? (selectedDepot ? Number(selectedDepot) : undefined)
    if (!depotId) { setError('Pilih depot terlebih dahulu'); return }
    if (!noPetak.trim()) { setError('No. petak wajib diisi'); return }

    setLoading(true)
    setError('')
    try {
      await api.post('/api/petak', {
        depot_id: depotId,
        no_petak: noPetak.trim(),
        jenis_kandang: jenis,
        kapasitas,
        posisi_x: posisiX,
        posisi_y: posisiY,
      })
      onSuccess()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'Gagal menyimpan petak'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface-lowest rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="font-display font-bold text-lg text-on-surface mb-4">Tambah Petak Kandang</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Depot selector — hanya tampil untuk SUPER_ADMIN (tidak ada depotId di sesi) */}
          {!sessionDepotId && (
            <div>
              <label className="block text-sm font-body font-medium text-on-surface mb-1">Depot</label>
              <select
                value={selectedDepot}
                onChange={e => setSelectedDepot(e.target.value)}
                className="input-field w-full"
                required
              >
                <option value="">Pilih depot...</option>
                {depots.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            </div>
          )}

          {/* No. Petak */}
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">No. Petak</label>
            <input
              type="text"
              value={noPetak}
              onChange={e => setNoPetak(e.target.value)}
              placeholder="Contoh: S-01"
              className="input-field w-full"
              required
            />
          </div>

          {/* Jenis toggle */}
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">Jenis Kandang</label>
            <div className="flex bg-surface-high rounded-xl p-1 gap-1 w-fit">
              {(['SAPI', 'DOMBA'] as const).map(j => (
                <button
                  key={j}
                  type="button"
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

          {/* Kapasitas */}
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">Kapasitas</label>
            <input
              type="number"
              min={1}
              value={kapasitas}
              onChange={e => setKapasitas(Number(e.target.value))}
              className="input-field w-full"
              required
            />
          </div>

          {/* Posisi */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-body font-medium text-on-surface mb-1">Baris</label>
              <input
                type="number"
                min={0}
                value={posisiX}
                onChange={e => setPosisiX(Number(e.target.value))}
                className="input-field w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-body font-medium text-on-surface mb-1">Kolom</label>
              <input
                type="number"
                min={0}
                value={posisiY}
                onChange={e => setPosisiY(Number(e.target.value))}
                className="input-field w-full"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-body font-medium text-on-surface-variant hover:bg-surface-high transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white disabled:opacity-60 hover:bg-primary/90 transition-colors"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KandangPage
// ---------------------------------------------------------------------------
export default function KandangPage() {
  const [petak, setPetak]           = useState<PetakData[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [jenis, setJenis]           = useState<'SAPI' | 'DOMBA'>('SAPI')
  const [loading, setLoading]       = useState(true)
  const [showTambah, setShowTambah] = useState(false)

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

        <div className="flex items-center gap-3">
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

          <button
            onClick={() => setShowTambah(true)}
            className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            + Tambah Petak
          </button>
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

      {showTambah && (
        <TambahPetakModal
          defaultJenis={jenis}
          onClose={() => setShowTambah(false)}
          onSuccess={() => { setShowTambah(false); loadPetak() }}
        />
      )}
    </div>
  )
}
