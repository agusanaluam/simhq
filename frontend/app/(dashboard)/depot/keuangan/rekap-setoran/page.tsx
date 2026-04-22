'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'

interface RekapEntry {
  metode: string
  total: number
  jumlah_transaksi: number
}

const METODE_LABEL: Record<string, string> = {
  CASH:          'Cash',
  TRANSFER_BCA:  'Transfer BCA',
  TRANSFER_LAIN: 'Transfer Lain',
}

const METODE_COLOR: Record<string, string> = {
  CASH:          'bg-green-50 border-green-300 text-green-800',
  TRANSFER_BCA:  'bg-blue-50 border-blue-300 text-blue-800',
  TRANSFER_LAIN: 'bg-purple-50 border-purple-300 text-purple-800',
}

export default function RekapSetoranPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [tgl, setTgl]     = useState(today)
  const [rekap, setRekap] = useState<RekapEntry[]>([])
  const [loading, setLoading] = useState(false)

  function load(date: string) {
    setLoading(true)
    api.get(`/api/laporan/rekap-setoran?tgl=${date}`)
      .then(r => setRekap(r.data.rekap ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(tgl) }, [tgl])

  const grandTotal = rekap.reduce((s, r) => s + Number(r.total), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Rekap Setoran</h1>
          <p className="text-sm text-on-surface-variant mt-1">Total penerimaan per metode per hari</p>
        </div>
        <div className="w-44">
          <Input type="date" value={tgl} onChange={e => setTgl(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant py-8 text-center">Memuat...</p>
      ) : rekap.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-8 text-center">Tidak ada setoran pada tanggal ini</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {rekap.map(r => (
              <Card key={r.metode} className={`border-2 ${METODE_COLOR[r.metode] ?? 'bg-surface-high border-surface-highest'}`}>
                <p className="font-body font-semibold text-sm mb-1">{METODE_LABEL[r.metode] ?? r.metode}</p>
                <p className="font-display font-bold text-2xl">
                  {Number(r.total).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs mt-1">{r.jumlah_transaksi} transaksi</p>
              </Card>
            ))}
          </div>
          <Card>
            <div className="flex items-center justify-between">
              <span className="font-body font-semibold text-on-surface">Total Semua Metode</span>
              <span className="font-display font-bold text-xl text-primary">
                {grandTotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
