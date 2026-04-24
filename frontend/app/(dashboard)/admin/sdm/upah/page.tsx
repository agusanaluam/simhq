'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface UpahRow {
  karyawan_id:     number
  nama:            string
  divisi:          string
  hari_hadir:      number
  tarif_harian:    number
  total_upah:      number
  potongan_kasbon: number
  upah_bersih:     number
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

const today        = new Date().toISOString().slice(0, 10)
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

export default function UpahPage() {
  const [rows,      setRows]      = useState<UpahRow[]>([])
  const [tglDari,   setTglDari]   = useState(firstOfMonth)
  const [tglSampai, setTglSampai] = useState(today)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!tglDari || !tglSampai) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/sdm/upah?tgl_dari=${tglDari}&tgl_sampai=${tglSampai}`)
      setRows(res.data.data ?? [])
    } catch {
      setError('Gagal memuat data upah.')
    } finally {
      setLoading(false)
    }
  }, [tglDari, tglSampai])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleExport() {
    try {
      const res = await api.get(
        `/api/sdm/upah/export?tgl_dari=${tglDari}&tgl_sampai=${tglSampai}`,
        { responseType: 'blob' }
      )
      const url  = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const link = document.createElement('a')
      link.href     = url
      link.download = `upah-${tglDari}-${tglSampai}.csv`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch {
      alert('Gagal export.')
    }
  }

  const totalUpah = rows.reduce((sum, r) => sum + r.upah_bersih, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Kalkulasi Upah Harian</h1>
          <p className="text-sm text-on-surface-variant mt-1">Tarif × hari hadir per karyawan</p>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

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

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <Card>
          {rows.length === 0 ? (
            <p className="text-center py-8 text-on-surface-variant text-sm">
              Tidak ada data karyawan atau tarif belum dikonfigurasi.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-high">
                    {['Nama', 'Divisi', 'Hari Hadir', 'Tarif Harian', 'Total Upah', 'Potongan Kasbon', 'Upah Bersih'].map((h) => (
                      <th key={h} className={`py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest ${
                        ['Hari Hadir', 'Tarif Harian', 'Total Upah', 'Potongan Kasbon', 'Upah Bersih'].includes(h) ? 'text-right' : 'text-left'
                      }`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.karyawan_id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                      <td className="py-3 px-4 font-body font-medium text-on-surface">{r.nama}</td>
                      <td className="py-3 px-4 font-body text-on-surface-variant">{r.divisi}</td>
                      <td className="py-3 px-4 font-display text-right text-on-surface">{r.hari_hadir}</td>
                      <td className="py-3 px-4 font-display text-right text-on-surface-variant whitespace-nowrap">
                        {r.tarif_harian > 0 ? rupiah(r.tarif_harian) : <span className="text-xs italic">Belum diset</span>}
                      </td>
                      <td className="py-3 px-4 font-display font-semibold text-right text-primary whitespace-nowrap">
                        {rupiah(r.total_upah)}
                      </td>
                      <td className="py-3 px-4 font-display text-right text-error whitespace-nowrap">
                        {r.potongan_kasbon > 0 ? rupiah(r.potongan_kasbon) : '—'}
                      </td>
                      <td className="py-3 px-4 font-display font-semibold text-right text-primary whitespace-nowrap">
                        {rupiah(r.upah_bersih)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-low border-t-2 border-surface-high">
                    <td colSpan={6} className="py-3 px-4 font-body font-semibold text-on-surface">Total</td>
                    <td className="py-3 px-4 font-display font-bold text-right text-primary whitespace-nowrap">{rupiah(totalUpah)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
