'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SummaryCards }    from './components/SummaryCards'
import { PendapatanTable, type PendapatanRow } from './components/PendapatanTable'
import { BiayaTable, type BiayaRow }           from './components/BiayaTable'
import api from '@/lib/api'

interface IncomeStatementData {
  musim:            number
  pendapatan_kelas: PendapatanRow[]
  total_pendapatan: number
  total_hpp:        number
  margin_bruto:     number
  biaya_divisi:     BiayaRow[]
  total_biaya:      number
  laba_bersih:      number
}

const emptyData: IncomeStatementData = {
  musim: new Date().getFullYear(),
  pendapatan_kelas: [],
  total_pendapatan: 0,
  total_hpp: 0,
  margin_bruto: 0,
  biaya_divisi: [],
  total_biaya: 0,
  laba_bersih: 0,
}

export default function IncomeStatementPage() {
  const currentYear = new Date().getFullYear()

  const [data,    setData]    = useState<IncomeStatementData>(emptyData)
  const [musim,   setMusim]   = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/laporan/income-statement?musim=${musim}`)
      setData(res.data)
    } catch {
      setError('Gagal memuat income statement.')
    } finally {
      setLoading(false)
    }
  }, [musim])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleExportCsv() {
    try {
      const res = await api.get(`/api/laporan/income-statement/export?musim=${musim}`, { responseType: 'blob' })
      const url  = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const link = document.createElement('a')
      link.href     = url
      link.download = `income-statement-${musim}.csv`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch {
      alert('Gagal export.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Income Statement</h1>
          <p className="text-sm text-on-surface-variant mt-1">Laporan laba rugi per kelas & divisi</p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button variant="secondary" onClick={handleExportCsv}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            Cetak PDF
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          <SummaryCards
            totalPendapatan={data.total_pendapatan}
            totalHPP={data.total_hpp}
            marginBruto={data.margin_bruto}
            totalBiaya={data.total_biaya}
            labaBersih={data.laba_bersih}
          />

          <div>
            <h2 className="font-display font-semibold text-base text-on-surface mb-3">
              Pendapatan per Kelas
            </h2>
            <PendapatanTable rows={data.pendapatan_kelas} />
          </div>

          <div>
            <h2 className="font-display font-semibold text-base text-on-surface mb-3">
              Biaya Operasional per Divisi
            </h2>
            <BiayaTable rows={data.biaya_divisi} totalBiaya={data.total_biaya} />
          </div>
        </div>
      )}
    </div>
  )
}
