'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface MortalitasRow {
  jenis:            string
  total_hewan:      number
  total_mati:       number
  total_sakit:      number
  total_kritis:     number
  rasio_mortalitas: number
}

export default function MortalitasPage() {
  const currentYear = new Date().getFullYear()
  const [rows,    setRows]    = useState<MortalitasRow[]>([])
  const [musim,   setMusim]   = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/hewan/mortalitas?musim=${musim}`)
      setRows(res.data.data ?? [])
    } catch {
      setError('Gagal memuat data mortalitas.')
    } finally {
      setLoading(false)
    }
  }, [musim])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Laporan Mortalitas</h1>
          <p className="text-sm text-on-surface-variant mt-1">Rekap kematian hewan per musim</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Musim</label>
          <input type="number" min="2020" max="2099" value={musim}
            onChange={(e) => setMusim(Number(e.target.value))}
            className="input-field text-sm w-24" />
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <Card>
          {rows.length === 0 ? (
            <p className="text-center py-8 text-on-surface-variant text-sm">Belum ada data hewan musim {musim}.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high">
                  {['Jenis', 'Total Hewan', 'Sakit', 'Kritis', 'Mati', 'Rasio Mortalitas'].map((h) => (
                    <th key={h} className={`py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest ${
                      h === 'Jenis' ? 'text-left' : 'text-right'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.jenis} className="border-b border-surface-high last:border-0">
                    <td className="py-3 px-4 font-body font-medium text-on-surface">{r.jenis}</td>
                    <td className="py-3 px-4 font-display text-right text-on-surface">{r.total_hewan}</td>
                    <td className={`py-3 px-4 font-display font-semibold text-right ${r.total_sakit > 0 ? 'text-[#ca8a04]' : 'text-on-surface-variant'}`}>
                      {r.total_sakit}
                    </td>
                    <td className={`py-3 px-4 font-display font-semibold text-right ${r.total_kritis > 0 ? 'text-[#ea580c]' : 'text-on-surface-variant'}`}>
                      {r.total_kritis}
                    </td>
                    <td className={`py-3 px-4 font-display font-semibold text-right ${r.total_mati > 0 ? 'text-error' : 'text-on-surface-variant'}`}>
                      {r.total_mati}
                    </td>
                    <td className={`py-3 px-4 font-display font-semibold text-right ${r.rasio_mortalitas >= 5 ? 'text-error' : 'text-[#15803d]'}`}>
                      {r.rasio_mortalitas}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  )
}
