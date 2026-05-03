'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { SaldoCards }     from './components/SaldoCards'
import { CashFlowChart }  from './components/CashFlowChart'
import { KasTable }       from './components/KasTable'
import { TambahKasModal } from './components/TambahKasModal'
import api from '@/lib/api'

interface KasEntry {
  id: number
  tipe: 'MASUK' | 'KELUAR'
  sumber: string | null
  divisi: string | null
  keterangan: string
  jumlah: number
  metode: string
  tgl_transaksi: string
  input_by: { id: number; name: string } | null
  rab: { id: number; kategori_id: number; musim: number; kategori: { id: number; nama: string } | null } | null
}

interface KasSummary {
  total_masuk: number
  total_keluar: number
  saldo: number
  per_metode: Array<{ metode: string; masuk: number; keluar: number }>
}

interface CashFlowItem {
  tanggal: string
  masuk: number
  keluar: number
}

interface DivisiItem {
  divisi: string
  total: number
}

const currentBulan = new Date().toISOString().slice(0, 7)

const DIVISI_OPTIONS = ['', 'KONSTRUKSI', 'LOGISTIK', 'ADMIN', 'CS', 'KANDANG', 'DISTRIBUSI', 'PAKAN', 'LISTRIK', 'LAIN']

export default function KeuanganPage() {
  const [entries, setEntries]   = useState<KasEntry[]>([])
  const [summary, setSummary]   = useState<KasSummary>({ total_masuk: 0, total_keluar: 0, saldo: 0, per_metode: [] })
  const [cashflow, setCashflow] = useState<CashFlowItem[]>([])
  const [perDivisi, setPerDivisi] = useState<DivisiItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const [tglDari,   setTglDari]   = useState('')
  const [tglSampai, setTglSampai] = useState('')
  const [divisi,    setDivisi]    = useState('')
  const [bulan,     setBulan]     = useState(currentBulan)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (tglDari)   params.set('tgl_dari',   tglDari)
      if (tglSampai) params.set('tgl_sampai', tglSampai)
      if (divisi)    params.set('divisi',      divisi)

      const [listRes, cfRes, divisiRes] = await Promise.all([
        api.get(`/api/keuangan/kas?${params}`),
        api.get(`/api/keuangan/cashflow?bulan=${bulan}`),
        api.get(`/api/keuangan/kas/per-divisi?${params}`),
      ])

      setEntries(listRes.data.entries?.data ?? [])
      setSummary(listRes.data.summary)
      setCashflow(cfRes.data.data ?? [])
      setPerDivisi(divisiRes.data.data ?? [])
    } catch {
      setError('Gagal memuat data keuangan.')
    } finally {
      setLoading(false)
    }
  }, [tglDari, tglSampai, divisi, bulan])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleExport() {
    try {
      const res = await api.get(`/api/keuangan/kas/export?bulan=${bulan}`, { responseType: 'blob' })
      const url  = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const link = document.createElement('a')
      link.href     = url
      link.download = `kas-${bulan}.csv`
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
          <h1 className="font-display font-bold text-2xl text-on-surface">Keuangan BIOP</h1>
          <p className="text-sm text-on-surface-variant mt-1">Buku kas harian depot</p>
        </div>
        <div className="flex gap-2">
          <Link href="/keuangan/rab">
            <Button variant="secondary">RAB &amp; Realisasi</Button>
          </Link>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            Tambah Kas
          </Button>
        </div>
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
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Divisi</label>
          <select value={divisi} onChange={(e) => setDivisi(e.target.value)} className="input-field text-sm">
            {DIVISI_OPTIONS.map((d) => <option key={d} value={d}>{d || '— Semua —'}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Bulan Chart</label>
          <input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} className="input-field text-sm" />
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
          <SaldoCards summary={summary} />
          <CashFlowChart data={cashflow} bulan={bulan} />

          {/* Biaya operasional per divisi */}
          {perDivisi.length > 0 && (
            <div>
              <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-3">
                Biaya Operasional per Divisi
              </p>
              <div className="bg-surface-lowest rounded-2xl border border-surface-high overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-high text-left text-xs text-on-surface-variant font-body">
                      <th className="pb-2 px-4 pt-3">Divisi</th>
                      <th className="pb-2 px-4 pt-3 text-right">Total Keluar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perDivisi.map((row, i) => (
                      <tr key={i} className="border-b border-surface-high last:border-0">
                        <td className="py-2 px-4 font-body text-on-surface">{row.divisi}</td>
                        <td className="py-2 px-4 font-body font-medium text-right text-error">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-surface-high">
                      <td className="pt-2 px-4 pb-3 font-body font-semibold text-on-surface text-xs uppercase tracking-wide">Total</td>
                      <td className="pt-2 px-4 pb-3 font-body font-semibold text-right text-error">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
                          perDivisi.reduce((s, r) => s + r.total, 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <KasTable entries={entries} />
        </div>
      )}

      {showModal && (
        <TambahKasModal
          onDone={() => { setShowModal(false); fetchData() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
