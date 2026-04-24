'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PosisiCards }        from './components/PosisiCards'
import { SetoranTable }       from './components/SetoranTable'
import { TambahSetoranModal } from './components/TambahSetoranModal'
import api from '@/lib/api'

interface SetoranEntry {
  id: number
  tgl_setor: string
  jumlah: number
  metode: string
  keterangan: string | null
  supplier: { id: number; nama: string } | null
  input_by: { id: number; name: string } | null
}

interface Posisi {
  total_pengadaan: number
  total_setor: number
  sisa_hutang: number
}

export default function SetoranGumPage() {
  const [entries,    setEntries]    = useState<SetoranEntry[]>([])
  const [posisi,     setPosisi]     = useState<Posisi>({ total_pengadaan: 0, total_setor: 0, sisa_hutang: 0 })
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [showModal,  setShowModal]  = useState(false)

  const [tglDari,   setTglDari]   = useState('')
  const [tglSampai, setTglSampai] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (tglDari)   params.set('tgl_dari',   tglDari)
      if (tglSampai) params.set('tgl_sampai', tglSampai)

      const [listRes, posisiRes] = await Promise.all([
        api.get(`/api/keuangan/setoran-gum?${params}`),
        api.get('/api/keuangan/setoran-gum/posisi'),
      ])

      setEntries(listRes.data.data ?? [])
      setPosisi(posisiRes.data)
    } catch {
      setError('Gagal memuat data setoran GUM.')
    } finally {
      setLoading(false)
    }
  }, [tglDari, tglSampai])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Setoran GUM</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manajemen hutang konsinyasi ke supplier GUM</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          Tambah Setoran
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-surface rounded-lg">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Dari</label>
          <input type="date" value={tglDari} onChange={(e) => setTglDari(e.target.value)} className="input-field text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Sampai</label>
          <input type="date" value={tglSampai} onChange={(e) => setTglSampai(e.target.value)} className="input-field text-sm" />
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          <PosisiCards posisi={posisi} />
          <div>
            <h2 className="font-display font-semibold text-base text-on-surface mb-3">Riwayat Setoran</h2>
            <SetoranTable entries={entries} />
          </div>
        </div>
      )}

      {showModal && (
        <TambahSetoranModal
          onDone={() => { setShowModal(false); fetchData() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
