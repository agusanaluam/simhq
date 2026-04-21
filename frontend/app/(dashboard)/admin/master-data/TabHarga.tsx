'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'

interface KelasHewan { id: number; kode: string; nama: string; urutan: number }
interface Depot      { id: number; nama: string }
interface Harga {
  id: number; jenis: string; musim: number
  harga_beli: number; harga_jual: number; fee_sales: number
  kelas: KelasHewan
}

export function TabHarga() {
  const [kelas, setKelas]     = useState<KelasHewan[]>([])
  const [depots, setDepots]   = useState<Depot[]>([])
  const [harga, setHarga]     = useState<Harga[]>([])
  const [depotId, setDepotId] = useState<string>('')
  const [musim, setMusim]     = useState<string>(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelas(r.data.data))
    api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
  }, [])

  function loadHarga() {
    if (!depotId) return
    setLoading(true)
    api.get(`/api/master/harga?depot=${depotId}&musim=${musim}`)
      .then(r => setHarga(r.data.data))
      .finally(() => setLoading(false))
  }

  function fmt(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Depot</label>
          <select
            value={depotId}
            onChange={e => setDepotId(e.target.value)}
            className="input-field mt-1.5"
          >
            <option value="">Pilih depot...</option>
            {depots.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Musim</label>
          <Input value={musim} onChange={e => setMusim(e.target.value)} className="mt-1.5 w-28" />
        </div>
        <Button onClick={loadHarga} disabled={!depotId}>Tampilkan</Button>
      </div>

      {loading && <p className="text-sm text-on-surface-variant">Memuat...</p>}

      {harga.length > 0 && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Kelas','Jenis','Harga Beli','Harga Jual','Fee Sales'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {harga.map((h, i) => (
                <tr key={h.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-4 font-body font-medium">{h.kelas?.kode ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{h.jenis}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface">{fmt(h.harga_beli)}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface">{fmt(h.harga_jual)}</td>
                  <td className="py-2.5 font-body text-on-surface-variant">{fmt(h.fee_sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {harga.length === 0 && depotId && !loading && (
        <p className="text-sm text-on-surface-variant text-center py-8">Belum ada harga untuk depot + musim ini.</p>
      )}
    </div>
  )
}
