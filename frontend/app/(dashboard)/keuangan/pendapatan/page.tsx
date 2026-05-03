'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface Pendapatan {
  pengadaan: number
  total_tagihan: number
  pendapatan: number
  total_setor_gum: number
  sisa_hutang_gum: number
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i)

export default function PendapatanPage() {
  const { data: session }    = useSession()
  const depotId              = (session?.user as any)?.depotId as number | undefined
  const [musim, setMusim]    = useState(String(CURRENT_YEAR))
  const [data, setData]      = useState<Pendapatan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!depotId) return
    setLoading(true)
    api.get(`/api/keuangan/pendapatan?depot=${depotId}&musim=${musim}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [depotId, musim])

  const margin = data ? data.total_tagihan - data.pengadaan : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Pendapatan Penjualan</h1>
          <p className="text-sm text-on-surface-variant mt-1">Ringkasan penjualan dan kewajiban GUM</p>
        </div>
        <select
          value={musim}
          onChange={e => setMusim(e.target.value)}
          className="input-field w-32"
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant py-8">Memuat...</p>
      ) : data ? (
        <div className="space-y-6">
          {/* Penjualan */}
          <div>
            <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-3">Penjualan Musim {musim}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
                  Total Tagihan
                </p>
                <p className="font-display font-bold text-2xl text-on-surface">
                  {rupiah(data.total_tagihan)}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">Total invoice ke customer</p>
              </Card>
              <Card>
                <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
                  Pendapatan Diterima
                </p>
                <p className="font-display font-bold text-2xl text-[#15803d]">
                  {rupiah(data.pendapatan)}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">Total sudah dibayar customer</p>
              </Card>
              <Card>
                <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
                  Margin Kotor
                </p>
                <p className={`font-display font-bold text-2xl ${margin >= 0 ? 'text-[#15803d]' : 'text-error'}`}>
                  {rupiah(margin)}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">Total tagihan − pengadaan</p>
              </Card>
            </div>
          </div>

          {/* Pengadaan & GUM */}
          <div>
            <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-3">Pengadaan & Kewajiban GUM</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
                  Total Pengadaan GUM
                </p>
                <p className="font-display font-bold text-2xl text-on-surface">
                  {rupiah(data.pengadaan)}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">Harga beli hewan dari supplier GUM</p>
              </Card>
              <Card>
                <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
                  Sudah Disetor ke GUM
                </p>
                <p className="font-display font-bold text-2xl text-[#15803d]">
                  {rupiah(data.total_setor_gum)}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">Total setoran ke supplier GUM</p>
              </Card>
              <Card>
                <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
                  Sisa Hutang GUM
                </p>
                <p className={`font-display font-bold text-2xl ${data.sisa_hutang_gum > 0 ? 'text-error' : 'text-[#15803d]'}`}>
                  {rupiah(data.sisa_hutang_gum)}
                </p>
                {data.sisa_hutang_gum > 0 && (
                  <p className="text-xs text-error mt-1">Belum lunas</p>
                )}
                {data.sisa_hutang_gum <= 0 && data.pengadaan > 0 && (
                  <p className="text-xs text-[#15803d] mt-1">Lunas</p>
                )}
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant py-8">Tidak ada data.</p>
      )}
    </div>
  )
}
