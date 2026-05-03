'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AssignHewanModal } from './AssignHewanModal'
import api from '@/lib/api'
import Link from 'next/link'

interface TransaksiItem {
  id: number
  tipe_qurban: string
  jenis: string
  is_preorder: boolean
  hewan: { no_hewan: string } | null
  kelas: { kode: string } | null
}

interface Transaksi {
  id: number
  no_faktur: string
  status_transaksi: string
  status_bayar: string
  total: number
  created_at: string
  customer: { nama: string; hp: string } | null
  items: TransaksiItem[]
}

const STATUS_LABEL: Record<string, string> = {
  MENUNGGU_HEWAN:   'Menunggu Hewan',
  HEWAN_TERALOKASI: 'Hewan Teralokasi',
  DIKONFIRMASI:     'Dikonfirmasi',
  SELESAI:          'Selesai',
  DIBATALKAN:       'Dibatalkan',
}

const STATUS_COLOR: Record<string, string> = {
  MENUNGGU_HEWAN:   'bg-yellow-100 text-yellow-800',
  HEWAN_TERALOKASI: 'bg-blue-100 text-blue-800',
  DIKONFIRMASI:     'bg-green-100 text-green-800',
  SELESAI:          'bg-gray-100 text-gray-700',
  DIBATALKAN:       'bg-red-100 text-red-700',
}

const BAYAR_LABEL: Record<string, string> = {
  BELUM_BAYAR: 'Belum Bayar',
  DP:          'DP',
  LUNAS:       'Lunas',
}

const BAYAR_COLOR: Record<string, string> = {
  BELUM_BAYAR: 'bg-red-100 text-red-700',
  DP:          'bg-yellow-100 text-yellow-800',
  LUNAS:       'bg-green-100 text-green-800',
}

export default function TransaksiPage() {
  const [list, setList]       = useState<Transaksi[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterBayar,    setFilterBayar]    = useState('')
  const [filterTipe,     setFilterTipe]     = useState('')
  const [filterNoHewan,  setFilterNoHewan]  = useState('')
  const [assignModal, setAssignModal] = useState<{ id: number; jenis: string } | null>(null)

  function load() {
    setLoading(true)
    const p = new URLSearchParams()
    if (filterStatus)  p.set('status',       filterStatus)
    if (filterBayar)   p.set('status_bayar', filterBayar)
    if (filterTipe)    p.set('tipe_qurban',  filterTipe)
    if (filterNoHewan) p.set('no_hewan',     filterNoHewan)
    api.get(`/api/transaksi?${p}`)
      .then(r => setList(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterStatus, filterBayar, filterTipe, filterNoHewan])

  async function konfirmasi(id: number) {
    await api.put(`/api/transaksi/${id}/konfirmasi`)
    load()
  }

  async function batal(id: number) {
    if (!confirm('Batalkan transaksi ini?')) return
    await api.put(`/api/transaksi/${id}/batal`)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Transaksi</h1>
          <p className="text-sm text-on-surface-variant mt-1">Semua transaksi penjualan</p>
        </div>
        <Link href="/depot/pos">
          <Button>+ Transaksi Baru</Button>
        </Link>
      </div>

      <div className="space-y-2 mb-4">
        {/* Status transaksi */}
        <div className="flex gap-2 flex-wrap">
          {['', 'MENUNGGU_HEWAN', 'HEWAN_TERALOKASI', 'DIKONFIRMASI', 'SELESAI', 'DIBATALKAN'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-body font-medium transition-colors ${
                filterStatus === s ? 'bg-primary text-white' : 'bg-surface-high text-on-surface-variant hover:text-on-surface'
              }`}>
              {s ? STATUS_LABEL[s] : 'Semua Status'}
            </button>
          ))}
        </div>

        {/* Status bayar */}
        <div className="flex gap-2 flex-wrap">
          {['', 'BELUM_BAYAR', 'DP', 'LUNAS'].map(s => (
            <button key={s} onClick={() => setFilterBayar(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-body font-medium transition-colors ${
                filterBayar === s ? 'bg-primary text-white' : 'bg-surface-high text-on-surface-variant hover:text-on-surface'
              }`}>
              {s ? BAYAR_LABEL[s] : 'Semua Pembayaran'}
            </button>
          ))}
        </div>

        {/* Tipe qurban + no hewan */}
        <div className="flex gap-2 flex-wrap items-center">
          {['', 'SHQ', 'THQ', 'PHQ'].map(t => (
            <button key={t} onClick={() => setFilterTipe(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-body font-medium transition-colors ${
                filterTipe === t ? 'bg-primary text-white' : 'bg-surface-high text-on-surface-variant hover:text-on-surface'
              }`}>
              {t || 'Semua Tipe'}
            </button>
          ))}
          <input
            type="text"
            value={filterNoHewan}
            onChange={e => setFilterNoHewan(e.target.value)}
            placeholder="Cari no hewan..."
            className="input-field text-xs w-36"
          />
        </div>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant py-8 text-center">Memuat...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-8 text-center">Belum ada transaksi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high text-left text-xs text-on-surface-variant font-body">
                  <th className="pb-2 pr-4">No Faktur</th>
                  <th className="pb-2 pr-4">Pembeli</th>
                  <th className="pb-2 pr-4">Hewan</th>
                  <th className="pb-2 pr-4">Tipe</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Bayar</th>
                  <th className="pb-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map(t => (
                  <tr key={t.id} className="border-b border-surface-high last:border-0">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/depot/transaksi/${t.id}`} className="font-body font-medium text-primary hover:underline">
                          {t.no_faktur}
                        </Link>
                        <a
                          href={`/faktur/${t.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-on-surface-variant hover:underline"
                        >
                          Cetak
                        </a>
                      </div>
                    </td>
                    <td className="py-2 pr-4 font-body">
                      <p className="font-medium text-on-surface">{t.customer?.nama ?? '—'}</p>
                      <p className="text-xs text-on-surface-variant">{t.customer?.hp}</p>
                    </td>
                    <td className="py-2 pr-4 font-body text-on-surface text-xs">
                      {t.items?.length > 0
                        ? t.items.map(item => (
                            <div key={item.id}>
                              {item.is_preorder
                                ? <span className="text-on-surface-variant italic">Pre-order</span>
                                : `#${item.hewan?.no_hewan ?? '—'}`}
                            </div>
                          ))
                        : <span className="text-on-surface-variant italic">—</span>}
                    </td>
                    <td className="py-2 pr-4 font-body text-xs">
                      {t.items?.length > 0
                        ? t.items.map(item => (
                            <div key={item.id} className="text-on-surface">
                              {item.tipe_qurban} · {item.jenis}
                              {item.kelas && <span className="text-on-surface-variant"> · {item.kelas.kode}</span>}
                            </div>
                          ))
                        : '—'}
                    </td>
                    <td className="py-2 pr-4 font-body font-medium text-on-surface">
                      {t.total.toLocaleString('id-ID', {
                        style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-body ${STATUS_COLOR[t.status_transaksi] ?? ''}`}>
                        {STATUS_LABEL[t.status_transaksi] ?? t.status_transaksi}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-body ${BAYAR_COLOR[t.status_bayar] ?? ''}`}>
                        {BAYAR_LABEL[t.status_bayar] ?? t.status_bayar}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {t.status_transaksi === 'MENUNGGU_HEWAN' && (
                          <button
                            onClick={() => setAssignModal({ id: t.id, jenis: t.items?.[0]?.jenis ?? 'SAPI' })}
                            className="text-xs text-primary hover:underline"
                          >
                            Assign Hewan
                          </button>
                        )}
                        {t.status_transaksi === 'HEWAN_TERALOKASI' && (
                          <button
                            onClick={() => konfirmasi(t.id)}
                            className="text-xs text-green-700 hover:underline"
                          >
                            Konfirmasi
                          </button>
                        )}
                        {!['SELESAI', 'DIBATALKAN'].includes(t.status_transaksi) && (
                          <button
                            onClick={() => batal(t.id)}
                            className="text-xs text-red-600 hover:underline ml-1"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {assignModal && (
        <AssignHewanModal
          transaksiId={assignModal.id}
          jenis={assignModal.jenis}
          onDone={() => { setAssignModal(null); load() }}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  )
}
