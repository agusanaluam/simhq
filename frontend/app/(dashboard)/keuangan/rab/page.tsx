'use client'

import { useState, useEffect, useCallback } from 'react'
import { RabSummaryTable, type DivisiRow } from './components/RabSummaryTable'
import { SetRabModal }          from './components/SetRabModal'
import { TambahRealisasiModal } from './components/TambahRealisasiModal'
import api from '@/lib/api'

export default function RabPage() {
  const currentYear = new Date().getFullYear()

  const [rows,    setRows]    = useState<DivisiRow[]>([])
  const [musim,   setMusim]   = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [setRabRow,    setSetRabRow]    = useState<DivisiRow | null>(null)
  const [realisasiRow, setRealisasiRow] = useState<DivisiRow | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/keuangan/rab/summary?musim=${musim}`)
      setRows(res.data.divisi ?? [])
    } catch {
      setError('Gagal memuat data RAB.')
    } finally {
      setLoading(false)
    }
  }, [musim])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">RAB & Realisasi</h1>
          <p className="text-sm text-on-surface-variant mt-1">Anggaran per divisi vs realisasi pengeluaran</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Musim</label>
          <input
            type="number"
            min="2020"
            max="2099"
            value={musim}
            onChange={(e) => setMusim(Number(e.target.value))}
            className="input-field text-sm w-24"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <RabSummaryTable
          rows={rows}
          onSetRab={(row) => setSetRabRow(row)}
          onAddRealisasi={(row) => setRealisasiRow(row)}
        />
      )}

      {setRabRow && (
        <SetRabModal
          divisi={setRabRow.divisi}
          musim={musim}
          currentAnggaran={setRabRow.jumlah_anggaran}
          onDone={() => { setSetRabRow(null); fetchData() }}
          onClose={() => setSetRabRow(null)}
        />
      )}

      {realisasiRow !== null && realisasiRow.rab_id !== null && (
        <TambahRealisasiModal
          rabId={realisasiRow.rab_id}
          divisi={realisasiRow.divisi}
          onDone={() => { setRealisasiRow(null); fetchData() }}
          onClose={() => setRealisasiRow(null)}
        />
      )}
    </div>
  )
}
