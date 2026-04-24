'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PengirimanCard } from './components/PengirimanCard'
import { JadwalModal }    from './components/JadwalModal'
import api from '@/lib/api'

interface PengirimanRow {
  id:            number
  nama_penerima: string
  alamat:        string
  no_hp1:        string
  tgl_kirim:     string
  sesi:          string
  status:        string
  petugas:       { name: string } | null
}

const SESI_OPTIONS = ['', 'PAGI', 'SIANG', 'SORE', 'MALAM']
const today        = new Date().toISOString().slice(0, 10)

export default function PengirimanPage() {
  const [rows,      setRows]      = useState<PengirimanRow[]>([])
  const [tgl,       setTgl]       = useState(today)
  const [sesi,      setSesi]      = useState('')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (tgl)  params.set('tgl',  tgl)
      if (sesi) params.set('sesi', sesi)
      const res = await api.get(`/api/pengiriman?${params}`)
      setRows(res.data.data ?? [])
    } catch {
      setError('Gagal memuat data pengiriman.')
    } finally {
      setLoading(false)
    }
  }, [tgl, sesi])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleStatusChange(id: number, status: string) {
    try {
      await api.put(`/api/pengiriman/${id}/status`, { status })
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
    } catch {
      alert('Gagal mengubah status.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Manajemen Pengiriman</h1>
          <p className="text-sm text-on-surface-variant mt-1">Jadwal &amp; status pengiriman hewan qurban</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          Jadwalkan
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-surface rounded-lg">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Tanggal</label>
          <input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} className="input-field text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Sesi</label>
          <select value={sesi} onChange={(e) => setSesi(e.target.value)} className="input-field text-sm">
            {SESI_OPTIONS.map((s) => <option key={s} value={s}>{s || '— Semua —'}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <p>Tidak ada pengiriman untuk tanggal {tgl || 'ini'}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <PengirimanCard
              key={r.id}
              {...r}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {showModal && (
        <JadwalModal
          onDone={() => { setShowModal(false); fetchData() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
