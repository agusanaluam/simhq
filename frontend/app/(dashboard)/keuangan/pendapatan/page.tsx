'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SetoranTable }       from '../setoran-gum/components/SetoranTable'
import { TambahSetoranModal } from '../setoran-gum/components/TambahSetoranModal'
import { formatDate } from '@/lib/format'
import api from '@/lib/api'

interface Pendapatan {
  pengadaan: number
  total_tagihan: number
  pendapatan: number
  total_setor_gum: number
  sisa_hutang_gum: number
  per_kelas: { kelas: string; jenis: string; jumlah_item: number; total_tagihan: number }[]
}

interface SetoranEntry {
  id: number
  tgl_setor: string
  jumlah: number
  metode: string
  keterangan: string | null
  supplier: { id: number; nama: string } | null
  input_by: { id: number; name: string } | null
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i)

export default function PendapatanPage() {
  const { data: session }       = useSession()
  const depotId                 = (session?.user as any)?.depotId as number | undefined
  const [musim, setMusim]       = useState(String(CURRENT_YEAR))
  const [data, setData]         = useState<Pendapatan | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  const [entries,     setEntries]     = useState<SetoranEntry[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [tglDari,    setTglDari]      = useState('')
  const [tglSampai,  setTglSampai]    = useState('')
  const [showModal,  setShowModal]    = useState(false)

  useEffect(() => {
    if (!depotId) return
    setLoadingData(true)
    api.get(`/api/keuangan/pendapatan?depot=${depotId}&musim=${musim}`)
      .then(r => setData(r.data))
      .finally(() => setLoadingData(false))
  }, [depotId, musim])

  const fetchSetoran = useCallback(async () => {
    if (!depotId) return
    setLoadingList(true)
    const p = new URLSearchParams()
    if (tglDari)   p.set('tgl_dari',   tglDari)
    if (tglSampai) p.set('tgl_sampai', tglSampai)
    api.get(`/api/keuangan/setoran-gum?${p}`)
      .then(r => setEntries(r.data.data ?? []))
      .finally(() => setLoadingList(false))
  }, [depotId, tglDari, tglSampai])

  useEffect(() => { fetchSetoran() }, [fetchSetoran])

  const margin = data ? data.total_tagihan - data.pengadaan : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Pendapatan & Setoran GUM</h1>
          <p className="text-sm text-on-surface-variant mt-1">Ringkasan penjualan dan kewajiban GUM</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={musim}
            onChange={e => setMusim(e.target.value)}
            className="input-field w-28"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            Tambah Setoran
          </Button>
        </div>
      </div>

      {loadingData ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-surface rounded-lg animate-pulse" />)}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Penjualan cards */}
          <div>
            <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-3">
              Penjualan Musim {musim}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">Total Tagihan</p>
                <p className="font-display font-bold text-2xl text-on-surface">{rupiah(data.total_tagihan)}</p>
                <p className="text-xs text-on-surface-variant mt-1">Total invoice ke customer</p>
              </Card>
              <Card>
                <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">Pendapatan Diterima</p>
                <p className="font-display font-bold text-2xl text-[#15803d]">{rupiah(data.pendapatan)}</p>
                <p className="text-xs text-on-surface-variant mt-1">Total sudah dibayar customer</p>
              </Card>
              <Card>
                <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">Margin Kotor</p>
                <p className={`font-display font-bold text-2xl ${margin >= 0 ? 'text-[#15803d]' : 'text-error'}`}>{rupiah(margin)}</p>
                <p className="text-xs text-on-surface-variant mt-1">Total tagihan − pengadaan</p>
              </Card>
            </div>
          </div>

          {/* GUM cards */}
          <div>
            <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-3">
              Pengadaan & Kewajiban GUM
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">Total Pengadaan GUM</p>
                <p className="font-display font-bold text-2xl text-on-surface">{rupiah(data.pengadaan)}</p>
                <p className="text-xs text-on-surface-variant mt-1">Harga beli hewan dari supplier GUM</p>
              </Card>
              <Card>
                <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">Sudah Disetor ke GUM</p>
                <p className="font-display font-bold text-2xl text-[#15803d]">{rupiah(data.total_setor_gum)}</p>
                <p className="text-xs text-on-surface-variant mt-1">Total setoran ke supplier GUM</p>
              </Card>
              <Card>
                <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">Sisa Hutang GUM</p>
                <p className={`font-display font-bold text-2xl ${data.sisa_hutang_gum > 0 ? 'text-error' : 'text-[#15803d]'}`}>
                  {rupiah(data.sisa_hutang_gum)}
                </p>
                {data.sisa_hutang_gum > 0 && <p className="text-xs text-error mt-1">Belum lunas</p>}
                {data.sisa_hutang_gum <= 0 && data.pengadaan > 0 && <p className="text-xs text-[#15803d] mt-1">Lunas</p>}
              </Card>
            </div>
          </div>

          {/* Per kelas table */}
          {data.per_kelas.length > 0 && (
            <div>
              <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-3">
                Tagihan per Kelas
              </p>
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-high text-left text-xs text-on-surface-variant font-body">
                        <th className="pb-2 pr-4">Kelas</th>
                        <th className="pb-2 pr-4">Jenis</th>
                        <th className="pb-2 pr-4 text-right">Jumlah Item</th>
                        <th className="pb-2 text-right">Total Tagihan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.per_kelas.map((row, i) => (
                        <tr key={i} className="border-b border-surface-high last:border-0">
                          <td className="py-2 pr-4 font-body font-medium text-on-surface">{row.kelas}</td>
                          <td className="py-2 pr-4 font-body text-on-surface-variant">{row.jenis}</td>
                          <td className="py-2 pr-4 font-body text-right text-on-surface">{row.jumlah_item}</td>
                          <td className="py-2 font-body font-medium text-right text-primary">{rupiah(row.total_tagihan)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-surface-high">
                        <td colSpan={2} className="pt-2 pr-4 font-body font-semibold text-on-surface text-xs uppercase tracking-wide">Total</td>
                        <td className="pt-2 pr-4 font-body font-semibold text-right text-on-surface">
                          {data.per_kelas.reduce((s, r) => s + r.jumlah_item, 0)}
                        </td>
                        <td className="pt-2 font-body font-semibold text-right text-primary">
                          {rupiah(data.per_kelas.reduce((s, r) => s + r.total_tagihan, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Riwayat setoran */}
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant">
                Riwayat Setoran GUM
              </p>
              <div className="flex gap-2">
                <input type="date" value={tglDari}   onChange={e => setTglDari(e.target.value)}   className="input-field text-xs" placeholder="Dari" />
                <input type="date" value={tglSampai} onChange={e => setTglSampai(e.target.value)} className="input-field text-xs" placeholder="Sampai" />
              </div>
            </div>
            {loadingList ? (
              <div className="h-24 bg-surface rounded-lg animate-pulse" />
            ) : (
              <SetoranTable entries={entries} />
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant py-8">Tidak ada data.</p>
      )}

      {showModal && (
        <TambahSetoranModal
          onDone={() => { setShowModal(false); fetchSetoran() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
