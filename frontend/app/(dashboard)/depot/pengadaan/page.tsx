'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import { TambahHewanModal } from './TambahHewanModal'
import { StatistikPanel } from './StatistikPanel'
import api from '@/lib/api'
import Link from 'next/link'

interface Hewan {
  id: number; no_hewan: string; jenis: string; status: string
  bobot_masuk: string; tgl_masuk: string
  kelas_asal: { kode: string } | null
  kelas_jual: { kode: string } | null
  supplier: { nama: string } | null
}

type StatusFilter = '' | 'AVAILABLE' | 'BOOKED' | 'SOLD' | 'DELIVERED' | 'MATI'

const STATUS_CHIP: Record<string, 'TERSEDIA' | 'DIPESAN' | 'TERJUAL' | 'MATI'> = {
  AVAILABLE: 'TERSEDIA', BOOKED: 'DIPESAN',
  SOLD: 'TERJUAL', DELIVERED: 'TERJUAL', MATI: 'MATI',
}

export default function PengadaanPage() {
  const [hewan, setHewan]         = useState<Hewan[]>([])
  const [loading, setLoading]     = useState(true)
  const [statusFilter, setStatus] = useState<StatusFilter>('')
  const [jenisFilter, setJenis]   = useState('')
  const [showModal, setShowModal] = useState(false)

  function loadHewan() {
    setLoading(true)
    const p = new URLSearchParams()
    if (statusFilter) p.set('status', statusFilter)
    if (jenisFilter)  p.set('jenis', jenisFilter)
    api.get(`/api/hewan?${p}`)
      .then(r => setHewan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadHewan() }, [statusFilter, jenisFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Pengadaan Hewan</h1>
          <p className="text-sm text-on-surface-variant mt-1">Daftar hewan masuk depot</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Tambah Hewan</Button>
      </div>

      <StatistikPanel />

      <div className="flex gap-3 my-4 flex-wrap">
        <select value={statusFilter} onChange={e => setStatus(e.target.value as StatusFilter)} className="input-field w-40">
          <option value="">Semua Status</option>
          {(['AVAILABLE','BOOKED','SOLD','DELIVERED','MATI'] as const).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={jenisFilter} onChange={e => setJenis(e.target.value)} className="input-field w-36">
          <option value="">Semua Jenis</option>
          <option value="SAPI">Sapi</option>
          <option value="DOMBA">Domba</option>
        </select>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['No','Jenis','Kelas Jual','Bobot','Tgl Masuk','Supplier','Status',''].map(h => (
                  <th key={h} className="pb-3 pr-3 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hewan.map((h, i) => (
                <tr key={h.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-3 font-display font-bold text-primary">{h.no_hewan}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.jenis}</td>
                  <td className="py-2.5 pr-3 font-body font-medium">{h.kelas_jual?.kode ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.bobot_masuk} kg</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.tgl_masuk}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.supplier?.nama ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    <StatusChip status={STATUS_CHIP[h.status] ?? 'TERSEDIA'} />
                  </td>
                  <td className="py-2.5">
                    <Link href={`/depot/pengadaan/${h.id}`} className="text-xs text-primary hover:underline">Detail</Link>
                  </td>
                </tr>
              ))}
              {hewan.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-on-surface-variant">Belum ada hewan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {showModal && (
        <TambahHewanModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadHewan() }}
        />
      )}
    </div>
  )
}
